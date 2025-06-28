#include "tree_sitter/parser.h"
#include "tree_sitter/alloc.h"
#include "tree_sitter/array.h"

enum TokenType {
    EOF_TOK,
};

typedef struct ZenithExternalScanner {
    bool lastWasEOF;
} ZenithExternalScanner;

static ZenithExternalScanner getExternalScanner() {
    ZenithExternalScanner scanner;

    scanner.lastWasEOF = false;

    return scanner;
}

void *tree_sitter_zenith_external_scanner_create() {
    ZenithExternalScanner* ret = ts_malloc(sizeof(*ret));

    *ret = getExternalScanner();

    return (void*) ret;
}

void tree_sitter_zenith_external_scanner_destroy(void *payload) {
    if (!payload) return;

    ts_free(payload);
}

unsigned tree_sitter_zenith_external_scanner_serialize(
    void *payload, // scanner
    char *buffer
) {
    // copy from payload into buffer

    memcpy(
        buffer,
        payload,
        sizeof(ZenithExternalScanner)
    );

    return sizeof(ZenithExternalScanner);
}

void tree_sitter_zenith_external_scanner_deserialize(
    void *payload, // scanner
    const char *buffer,
    unsigned length
) {
    // copy to payload (scanner) from buffer

    memcpy(
        payload,
        buffer,
        length
    );
}

bool tree_sitter_zenith_external_scanner_scan(
    void *payload,
    TSLexer *lexer,
    const bool *valid_symbols
) {
    ZenithExternalScanner* scanner = (ZenithExternalScanner*) payload;

    // do not emit repeated EOF tokens
    // also obviously check lexer to see if it is at EOF

    if (scanner->lastWasEOF || !lexer->eof(lexer)) {
        scanner->lastWasEOF = false;

        return false;
    }

    scanner->lastWasEOF = true;

    lexer->mark_end(lexer);
    lexer->result_symbol = EOF_TOK;

    return true;
}