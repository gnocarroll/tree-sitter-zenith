/**
 * @file parser for zenith language
 * @author George O'Carroll <gocarrol@purdue.edu>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const LINE_SEP = "\n";

module.exports = grammar({
  name: "zenith",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => repeat($._definition),

    _definition: $ => choice(
      $.function_definition,
      $.type_definition,
    ),

    function_definition: $ => seq(
      "function",
      $.identifier,
      "(",
      $.optional_newlines,
        // zero or more args followed by comma
        repeat(
          seq(
            $.create_instance,
            ",",
            $.optional_newlines,
          )
        ),

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
      optional(seq( // return type (can give var name)
        "=>",
        choice(
          $.type,
          $.pattern_and_type,
        ),
      )),
      repeat($._statement),
      "end",
      $.identifier,
    ),

    // e.g. A : T = B or A := B
    create_instance: $ => choice(
      seq($.pattern_and_type, optional(seq("=", $.expr))),
      seq($.pattern, ":=", $.expr),
    ),

    pattern_and_type: $ => seq(
      $.pattern,
      ":",
      $.type,
    ),

    expr: $ => choice(

    ),

    type: $ => choice(
      $.identifier_w_namespace,
    ),

    _statement: $ => choice(
      $.inc_dec_statement,
    ),

    inc_dec_statement: $ => seq(
      $.identifier,
      choice($.inc, $.dec),
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

    optional_newlines: $ => optional(seq(LINE_SEP)),

    inc: $ => "++",
    dec: $ => "--",

    identifier: $ => /[A-Za-z_][A-Za-z0-9_]*/,
    digits: $ => /\d+/,
  }
});
