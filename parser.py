from lark import Lark, Transformer
from ir import ModelIR, Input, Layer, TrainConfig

grammar = open("d:\\vscode\\ailang\\grammar.lark").read()
ail_parser = Lark(grammar, start="start")

class AILTransformer(Transformer):
    def model_block(self, items):
        name, input_block, *layer_blocks = items
        return {"name": name, "input": input_block, "layers": layer_blocks}

    def input_block(self, items):
        return Input(size=int(items[0]))

    def layer_block(self, items):
        return Layer(units=int(items[0]), activation=items[1][1:-1])

    def train_block(self, items):
        return items[0]

    def train_config(self, items):
        return TrainConfig(epochs=int(items[0]), batch_size=int(items[1]))

    def start(self, items):
        model = items[0]
        train_config = items[1] if len(items) > 1 else None
        return ModelIR(
            name=model["name"],
            input=model["input"],
            layers=model["layers"],
            train_config=train_config,
        )
