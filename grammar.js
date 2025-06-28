/**
 * @file parser for zenith language
 * @author George O'Carroll <gocarrol@purdue.edu>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const B_EXPR = function($, prec_no, operators) {
  let middle_arg;
  
  if (typeof operators === "string") {
    middle_arg = operators;
  }
  else if (Array.isArray(operators) &&
    operators.every(element => typeof element === "string")) {
    
    if (operators.length === 0) {
      throw new Error("length of array should be > 0");
    }
    else if (operators.length === 1) {
      middle_arg = operators[0];
    }
    else {
      middle_arg = choice(...operators,);
    }
  }
  else {
    throw new Error("provide string or array of strings for operators");
  }

  return prec.left(prec_no, seq(
    field("lhs", $._expr),
    field("op", middle_arg),
    field("rhs", $._expr),
  ));
};

const NEWLINE = function($) {
  return choice("\n", $.eof_tok);
}

const MAYBE_NEWLINES = function($) {
  return repeat(NEWLINE($));
}

const PARAMS = function($, repeated) {
  return seq(
    MAYBE_NEWLINES($),
    optional(seq(
      repeated,
      repeat(seq(
        ",",
        MAYBE_NEWLINES($),
        repeated,
      )),
      optional(","),
      MAYBE_NEWLINES($),
    ),
  ));
}

const BOOL_BINARY_OPS = [
  ["or"],
  ["and"],
  ["==", "!="],
  ["<", "<=", ">", ">="],
]

const NUM_BINARY_OPS = [
  ["|"],
  ["^"],
  ["&"],
  ["+", "-"],
  ["*", "/", "%"],
  ["**"],
];

const UNARY_OPS = [
  "+",
  "-",
  "not",
  "~",
];

const MIN_NUM_BINARY_PREC = BOOL_BINARY_OPS.length + 1
const UNARY_PREC = MIN_NUM_BINARY_PREC + NUM_BINARY_OPS.length
const POSTFIX_PREC = UNARY_PREC + 1

module.exports = grammar({
  name: "zenith",

  externals: $ => [$.eof_tok],

  extras: $ => [
    /\\[ \t\r\f\v]*\n/, // escaped newline
    /[ \t\r\f\v]/, // whitespace excluding newline
  ],

  word: $ => $.identifier,

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => repeat($._definition),

    _definition: $ => choice(
      $.function_definition,
      $._type_definition,
    ),

    _type_definition: $ => choice(
      $.number_definition,
    ),

    number_definition: $ => seq(
      choice(
        "signed",
        "unsigned",
        "float",
      ),
      field("name", $.identifier),
      NEWLINE($),

      field("definitions", repeat($._definition)),
      
      "end",
      field("endName", $.identifier),
      NEWLINE($),
    ),

    function_definition: $ => seq(
      "function",
      field("name", $.identifier),
      field("params", $.function_definition_parameters),
      optional(seq( // return type (can give var name)
        "=>",
        field("returnSpec", choice(
          $.type,
          $.pattern_and_type,
        )),
      )),
      NEWLINE($),
      
      repeat($._statement),
      
      "end",
      field("endName", $.identifier),
      NEWLINE($),
    ),

    function_definition_parameters: $ => seq(
      "(",
      PARAMS($, $.create_instance),
      ")",
    ),

    // e.g. A : T = B or A := B
    create_instance: $ => choice(
      seq($.pattern_and_type, optional(seq("=", $._expr))),
      seq($.pattern, ":=", $._expr),
    ),

    pattern_and_type: $ => seq(
      field("pattern", $.pattern),
      ":",
      field("type", $.type),
    ),

    _expr: $ => choice(
      $.primary_expr,
      $.unary_expr,
      $.binary_expr,
      $.postfix_expr,
    ),

    primary_expr: $ => choice(
      $.identifier_w_namespace,
      $.float_literal,
      $.integer_literal,
      seq("(", $._expr, ")"),
    ),

    unary_expr: $ => choice(
      prec.right(UNARY_PREC, seq(
        field("op", choice(
          ...UNARY_OPS,
        )),
        field("subExpr", $._expr),
      )),
    ),

    binary_expr: $ => choice(
      ...(BOOL_BINARY_OPS.map((op, idx) => B_EXPR($, 1 + idx, op))),
      ...(NUM_BINARY_OPS.map((op, idx) => B_EXPR(
        $,
        MIN_NUM_BINARY_PREC + idx,
        op,
      ))),
    ),

    postfix_expr: $ => prec.left(
      POSTFIX_PREC,
      choice(
        $.array_access_expr,
        $.member_access_expr,
        $.function_call_expr,
      ),
    ),

    array_access_expr: $ => seq(
      field("lhs", $._expr),
      seq("[", $._expr, "]"), // array access
    ),

    member_access_expr: $ => seq(
      field("lhs", $._expr),
      seq(".", $.identifier), // member access
    ),

    function_call_expr: $ => seq(
      field("lhs", $._expr),
      $.function_call_parameters,
    ),

    function_call_parameters: $ => seq(
      "(",
      PARAMS($, $.arg_or_kwarg),
      ")",
    ),

    arg_or_kwarg: $ => choice(
      $._expr,
      $.kwarg,
    ),

    kwarg: $ => seq($.pattern, "=", $._expr),

    type: $ => choice(
      $.identifier_w_namespace,
    ),

    _statement: $ => seq(
      choice(
        $.create_instance_statement,
        $.modify_instance_statement,
        $.function_call_statement,
        $.inc_dec_statement,
      ),
      MAYBE_NEWLINES($), // may have additional newlines following statement
    ),

    create_instance_statement: $ => seq(
      $.create_instance,
      NEWLINE($),
    ),

    modify_instance_statement: $ => seq(
      $.pattern,
      choice(
        "=",
        ...(NUM_BINARY_OPS.flat().map(op => (op + "="))),
      ),
      $._expr,
      NEWLINE($),
    ),

    function_call_statement: $ => seq(
      $.function_call_expr,
      NEWLINE($),
    ),

    inc_dec_statement: $ => seq(
      $.identifier_w_namespace,
      choice("++", "--"),
      NEWLINE($),
    ),

    pattern: $ => choice (
      $.identifier_w_namespace,
    ),

    identifier_w_namespace: $ => seq(
      // 0+ namespaces first
      field("namespaces", repeat(
        seq($.identifier, "::"),
      )),

      // identifier itself
      field("name", $.identifier),

      // optional template params
      optional(seq(
        "::",
        field("templateParams", $.template_instantiation_parameters),
      )),
    ),

    template_instantiation_parameters: $ => seq(
      "<",
      PARAMS($, $.arg_or_kwarg),
      ">",
    ),

    identifier: $ => /[A-Za-z_][A-Za-z0-9_]*/,

    float_literal: $ => /(\d+\.\d*|\d*\.\d+)([Ee]\d+)?/,
    integer_literal: $ => /\d+/,
  }
});
