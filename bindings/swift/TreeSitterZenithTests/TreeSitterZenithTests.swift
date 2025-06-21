import XCTest
import SwiftTreeSitter
import TreeSitterZenith

final class TreeSitterZenithTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_zenith())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Zenith grammar")
    }
}
