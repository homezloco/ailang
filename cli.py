import argparse
from parser import ail_parser, AILTransformer
from ir import ModelIR

def parse_ail(file_path):
    with open(file_path, "r") as f:
        code = f.read()
    tree = ail_parser.parse(code)
    return AILTransformer().transform(tree)

def transpile_to_python(model_ir):
    layers_code = "\n        ".join(
        f"self.layers.append(Dense({layer['units']}, activation='{layer['activation']}'))"
        for layer in model_ir["layers"]
    )
    train_code = (
        f"""
        model.compile(optimizer='adam', loss='mse')
        model.fit(x_train, y_train, epochs={model_ir['train_config']['epochs']}, batch_size={model_ir['train_config']['batch_size']})
        """
        if model_ir["train_config"]
        else ""
    )
    return f"""
import tensorflow as tf
from tensorflow.keras import Sequential
from tensorflow.keras.layers import Dense

class {model_ir['name']}(Sequential):
    def __init__(self):
        super().__init__()
        self.add(tf.keras.Input(shape=({model_ir['input']['size']},)))
        {layers_code}
        {train_code}
"""

def main():
    parser = argparse.ArgumentParser(description="AILang CLI")
    parser.add_argument("input", help="Path to the .ail file")
    parser.add_argument("--to-python", action="store_true", help="Transpile to Python")
    args = parser.parse_args()

    model_ir = parse_ail(args.input)
    model = ModelIR(model_ir["name"], model_ir["input"], model_ir["layers"])

    if args.to_python:
        print(transpile_to_python(model.to_dict()))

if __name__ == "__main__":
    main()
