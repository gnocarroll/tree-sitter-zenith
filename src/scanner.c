#include "tree_sitter/parser.h"
#include "tree_sitter/alloc.h"
#include "tree_sitter/array.h"


/// @brief per tree sitter docs, imitate order of grammar's `externals`
enum TokenType {
    NEWLINE,
};

void *tree_sitter_zenith_external_scanner_create() {
    return NULL;
}

void tree_sitter_zenith_external_scanner_destroy(void *payload) {

}

unsigned tree_sitter_zenith_external_scanner_serialize(
    void *payload,
    char *buffer
) {
    return 0;
}

void tree_sitter_zenith_scanner_deserialize(
    void *payload,
    const char *buffer,
    unsigned length
) {

}

bool tree_sitter_zenith_external_scanner_scan(
    void *payload,
    TSLexer *lexer,
    const bool *valid_symbols
) {
    return false;
}