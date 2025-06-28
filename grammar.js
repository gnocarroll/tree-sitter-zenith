/**
 * @file parser for zenith language
 * @author George O'Carroll <gocarrol@purdue.edu>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const GET_STR_OR_CHOICE = function(str_or_arr) {
  if (typeof str_or_arr === "string") {
    return str_or_arr;
  }
  else if (Array.isArray(str_or_arr) &&
    str_or_arr.every(element => typeof element === "string")) {
    
    if (str_or_arr.length === 0) {
      throw new Error("length of array should be > 0");
    }
    else if (str_or_arr.length === 1) {
      return str_or_arr[0];
    }
    else {
      return choice(...str_or_arr,);
    }
  }
  else {
    throw new Error("provide string or array of strings for operators");
  }
};

const B_EXPR = function($, prec_no, operators) {
  return prec.left(prec_no, seq(
    field("lhs", $._expr),
    field("op", GET_STR_OR_CHOICE(operators)),
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

const REPEAT_W_NEWLINES = function($, repeated) {
  return seq(
    MAYBE_NEWLINES($),
    repeat(seq(
      repeated,
      MAYBE_NEWLINES($),
    )),
  );
};

const REPEAT_STATEMENT = function($) {
  return REPEAT_W_NEWLINES($, $._statement);
}

const REPEAT_DEFINITION = function($) {
  return REPEAT_W_NEWLINES($, $.definition);
}

const START_TYPEDEF = function($, start_options) {
  return seq(
    GET_STR_OR_CHOICE(start_options),
    field("name", $.identifier),
    NEWLINE($),

    optional($.attributes),
  );
}

const END_TYPEDEF = function($) {
  return seq(
    "end",
    field("endName", $.identifier),
    NEWLINE($),
  );
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
      $.class_definition,
      $.enum_definition,
      $.number_definition,
    ),

    class_definition: $ => seq(
      START_TYPEDEF($, ["struct", "class"]),

      // members are another definition (e.g. of a type or function)
      // or create instance (regular or static member)
      field("members", REPEAT_W_NEWLINES($, choice(
        seq($.create_instance, NEWLINE($)),
        $._definition,
      ))),

      END_TYPEDEF($),
    ),

    enum_definition: $ => seq(
      START_TYPEDEF($, "enum"),

      field("definitions", REPEAT_DEFINITION($)),

      END_TYPEDEF($),
    ),

    number_definition: $ => seq(
      START_TYPEDEF($, ["signed", "unsigned", "float"]),

      field("definitions", REPEAT_DEFINITION($)),
      
      END_TYPEDEF($),
    ),

    attributes: $ => seq(
      "attributes",
      NEWLINE($),

      // set attributes to desired values
      field("attributeValues", REPEAT_W_NEWLINES($, seq(
        $.pattern,
        "=",
        $._expr,
        NEWLINE($),
      ))),

      "end",
      "attributes",
      NEWLINE($),
    ),

    function_definition: $ => seq(
      "function",
      field("name", $.identifier),
      field("params", $.function_definition_parameters),
      optional($.function_return_spec),
      NEWLINE($),
      
      field("body", REPEAT_STATEMENT($)),
      
      "end",
      field("endName", $.identifier),
      NEWLINE($),
    ),

    function_definition_parameters: $ => seq(
      "(",
      PARAMS($, $.create_instance),
      ")",
    ),

    function_return_spec: $ => seq( // return type (can give var name)
      "=>",
      field("returnSpec", choice(
        $.type,
        $.pattern_and_type,
      )),
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
      $.simple_literal,
      seq("(", $._expr, ")"),
      $.function_literal,
    ),

    simple_literal: $ => choice(
      $.float_literal,
      $.integer_literal,
      $.bool_literal,
    ),

    function_literal: $ => seq(
      "function",
      field("params", $.function_definition_parameters),
      optional($.function_return_spec),
      NEWLINE($),

      field("body", REPEAT_STATEMENT($)),

      "end",
      "function", // may not have newline immediately after
    ),

    bool_literal: $ => choice(
      "true",
      "false",
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

    _statement: $ => choice(
      $.create_instance_statement,
      $.modify_instance_statement,
      $.function_call_statement,
      $.inc_dec_statement,
      $.if_statement,
      $.while_statement,
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

    if_statement: $ => seq(
      "if",
      field("condition", $._expr),
      NEWLINE($),

      field("ifBody", REPEAT_STATEMENT($)),
      
      // maybe some else ifs
      repeat(seq(
        "else",
        "if",
        field("elseIfCondition", $._expr),
        NEWLINE($),

        field("elseIfBody", REPEAT_STATEMENT($)),
      )),

      // else block
      optional(seq(
        "else",
        NEWLINE($),

        field("elseBody", REPEAT_STATEMENT($)),
      )),

      "end",
      "if",
      NEWLINE($),
    ),

    while_statement: $ => seq(
      "while",
      field("condition", $._expr),
      NEWLINE($),

      field("body", REPEAT_STATEMENT($)),

      "end",
      "while",
      NEWLINE($),
    ),

    for_statement: $ => seq(
      "for",
      $.pattern,
      "in",
      $._expr,
      NEWLINE($),

      REPEAT_STATEMENT($),

      "end",
      "for",
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
