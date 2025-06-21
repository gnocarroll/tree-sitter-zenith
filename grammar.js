/**
 * @file parser for zenith language
 * @author George O'Carroll <gocarrol@purdue.edu>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "zenith",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello",

    identifier: $ => /[A-Za-z_][A-Za-z0-9_]*/,
    digits: $ => /\d+/,
  }
});
