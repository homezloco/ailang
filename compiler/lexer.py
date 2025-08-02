from lark import Lark

# Load grammar from grammar.lark
with open("d:\\vscode\\ailang\\compiler\\grammar.lark", "r") as grammar_file:
    grammar = grammar_file.read()

# Initialize the Lark parser
lexer = Lark(grammar, start="start", parser="lalr")
