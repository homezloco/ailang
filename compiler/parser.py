from lark import Transformer, Tree
from .lexer import lexer

# Define custom Python classes for the IR
class Model:
    def __init__(self, name, layers):
        self.name = name
        self.layers = layers

class Layer:
    def __init__(self, name, units, activation=None):
        self.name = name
        self.units = units
        self.activation = activation

# Transformer to convert Lark tree into IR objects
class IRTransformer(Transformer):
    def model_definition(self, items):
        name = items[0]
        layers = items[1:]
        return Model(name, layers)

    def layer_definition(self, items):
        name = items[0]
        units = int(items[1])
        activation = items[2] if len(items) > 2 else None
        return Layer(name, units, activation)

# Parse input text and transform it into IR
def parse(input_text):
    tree = lexer.parse(input_text)
    return IRTransformer().transform(tree)
