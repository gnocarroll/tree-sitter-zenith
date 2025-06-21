package tree_sitter_zenith_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_zenith "github.com/gnocarroll/tree-sitter-zenith//bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_zenith.Language())
	if language == nil {
		t.Errorf("Error loading Zenith grammar")
	}
}
