class Input:
    def __init__(self, size):
        self.size = size

class Layer:
    def __init__(self, units, activation):
        self.units = units
        self.activation = activation

class TrainConfig:
    def __init__(self, epochs, batch_size):
        self.epochs = epochs
        self.batch_size = batch_size

class ModelIR:
    def __init__(self, name, input, layers, train_config=None):
        self.name = name
        self.input = input
        self.layers = layers
        self.train_config = train_config

    def to_dict(self):
        return {
            "name": self.name,
            "input": {"size": self.input.size},
            "layers": [{"units": l.units, "activation": l.activation} for l in self.layers],
            "train_config": {
                "epochs": self.train_config.epochs,
                "batch_size": self.train_config.batch_size,
            } if self.train_config else None,
        }

    def to_python(self):
        layers_code = "\n    ".join(
            f"model.add(Dense({layer.units}, activation='{layer.activation}'))"
            for layer in self.layers
        )
        return f"""
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense

def create_model():
    model = Sequential()
    model.add(Dense({self.input.size}, input_shape=({self.input.size},)))
    {layers_code}
    return model
"""

# Example usage
def from_parsed(parsed):
    return ModelIR(
        name=parsed["name"],
        input=Input(parsed["input"]["size"]),
        layers=[Layer(l["units"], l["activation"]) for l in parsed["layers"]],
        train_config=TrainConfig(parsed["train_config"]["epochs"], parsed["train_config"]["batch_size"]) if parsed.get("train_config") else None
    )
