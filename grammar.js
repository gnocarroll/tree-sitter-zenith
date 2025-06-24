/**
 * @file parser for zenith language
 * @author George O'Carroll <gocarrol@purdue.edu>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const LINE_SEP = "\n";

const B_EXPR = ($, prec_no, operator) => prec.left(prec_no, seq(
  field("lhs", $.expr),
  field("op", operator),
  field("rhs", $.expr),
));

module.exports = grammar({
  name: "zenith",

  word: $ => $.identifier,

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => repeat($._definition),

    _definition: $ => choice(
      $.function_definition,
    ),

    function_definition: $ => seq(
      "function",
      field("name", $.identifier),
      field("parameters", $.parameter_list),
      optional(seq( // return type (can give var name)
        "=>",
        field("returnSpec", choice(
          $.type,
          $.pattern_and_type,
        )),
      )),
      LINE_SEP,
      repeat(seq($._statement, LINE_SEP)),
      "end",
      field("endName", $.identifier),
    ),

    parameter_list: $ => seq(
      "(",
      $.optional_newlines,
        // zero or more args followed by comma
        repeat(prec.right(
          seq(
            $.create_instance,
            ",",
            $.optional_newlines,
          )
        )),

        // for last arg separate it out so comma can
        // be optional
        optional(
          seq(
            $.create_instance,
            optional(","),
            $.optional_newlines,
          )
        ),
      ")",
    ),

    // e.g. A : T = B or A := B
    create_instance: $ => choice(
      seq($.pattern_and_type, optional(seq("=", $.expr))),
      seq($.pattern, ":=", $.expr),
    ),

    pattern_and_type: $ => seq(
      field("pattern", $.pattern),
      ":",
      field("type", $.type),
    ),

    expr: $ => choice(
      $.primary_expr,
      $.unary_expr,
      $.binary_expr,
      $.postfix_expr,
    ),

    primary_expr: $ => choice(
      $.identifier_w_namespace,
      $.float_literal,
      $.integer_literal,
      seq("(", $.expr, ")"),
    ),

    unary_expr: $ => choice(
      prec.right(10,seq(
        field("op", choice(
          "+", "-",
          "not",
          "~",
        )),
        field("subExpr", $.expr),
      )),
    ),

    binary_expr: $ => choice(
      // logical or, and
      B_EXPR($, 1, "or"),
      B_EXPR($, 2, "and"),
      
      // comparison operators
      B_EXPR($, 3, choice("==", "!=")),
      B_EXPR($, 4, choice(
        "<", "<=", ">", ">="
      )),

      // bitwise binary operators
      B_EXPR($, 5, "|"),
      B_EXPR($, 6, "^"),
      B_EXPR($, 7, "&"),

      // addition and subtraction, then mult/div/mod
      B_EXPR($, 8, choice(
        "+", "-",
      )),
      B_EXPR($, 9, choice(
        "*", "/", "%",
      )),
    ),

    postfix_expr: $ => prec.left(11, seq(
      field("lhs", $.expr),
      choice(
        seq(".", $.identifier), // member access
        seq("[", $.expr, "]"), // array access
        $.function_call_args,
      )
    )),

    function_call_args: $ => seq(
      "(",
      seq(
        // parser will not enforce args before kwargs,
        // that wil come later in processing
        repeat(prec.right(seq($.arg_or_kwarg, ","))),
        optional(seq($.arg_or_kwarg, optional(","))),
      ),
      ")",
    ),

    arg_or_kwarg: $ => choice(
      $.expr,
      $.kwarg,
    ),

    kwarg: $ => seq($.pattern, "=", $.expr),

    type: $ => choice(
      $.identifier_w_namespace,
    ),

    _statement: $ => choice(
      $.create_instance,
      $.inc_dec_statement,
    ),

    inc_dec_statement: $ => seq(
      $.identifier,
      choice("++", "--"),
    ),

    pattern: $ => choice (
      $.identifier_w_namespace,
    ),

    identifier_w_namespace: $ => seq(
      // 0+ namespaces first
      repeat(
        seq($.identifier, "::"),
      ),
      // identifier itself
      $.identifier,
    ),

    optional_newlines: $ => token(repeat(LINE_SEP)),

    identifier: $ => /[A-Za-z_][A-Za-z0-9_]*/,

    float_literal: $ => /(\d+\.\d*|\d*\.\d+)([Ee]\d+)?/,
    integer_literal: $ => /\d+/,
  }
});
