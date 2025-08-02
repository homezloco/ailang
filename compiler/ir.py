# Define IR classes for the compiler
class Model:
    def __init__(self, name, layers):
        self.name = name
        self.layers = layers

class Layer:
    def __init__(self, name, units, activation=None):
        self.name = name
        self.units = units
        self.activation = activation

class Input:
    def __init__(self, name, shape):
        self.name = name
        self.shape = shape

class TrainConfig:
    def __init__(self, dataset, epochs):
        self.dataset = dataset
        self.epochs = epochs

class Optimizer:
    def __init__(self, name):
        self.name = name

class Loss:
    def __init__(self, name):
        self.name = name
