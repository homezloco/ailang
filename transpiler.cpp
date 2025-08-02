#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include <vector>
#include <cassert>

void generateModelClass(const std::string& modelName, int inputSize, const std::vector<std::pair<int, std::string>>& layers) {
    std::ofstream outFile(modelName + ".cpp");
    outFile << "#include <Eigen/Dense>\n\n";
    outFile << "class " << modelName << " {\n";
    outFile << "public:\n";
    outFile << "    " << modelName << "() {}\n\n";
    outFile << "    Eigen::MatrixXd forward(const Eigen::MatrixXd& input) {\n";
    outFile << "        Eigen::MatrixXd x = input;\n";

    for (size_t i = 0; i < layers.size(); ++i) {
        const auto& [units, activation] = layers[i];
        outFile << "        // Layer " << i + 1 << "\n";
        outFile << "        Eigen::MatrixXd W" << i + 1 << " = Eigen::MatrixXd::Random(" << units << ", x.cols());\n";
        outFile << "        Eigen::VectorXd b" << i + 1 << " = Eigen::VectorXd::Random(" << units << ");\n";
        outFile << "        x = (W" << i + 1 << " * x).colwise() + b" << i + 1 << ";\n";
        if (activation == "\"relu\"") {
            outFile << "        x = x.cwiseMax(0.0);\n";
        } else if (activation == "\"sigmoid\"") {
            outFile << "        x = 1.0 / (1.0 + (-x.array()).exp());\n";
        }
        outFile << "\n";
    }

    outFile << "        return x;\n";
    outFile << "    }\n";
    outFile << "};\n";
    outFile.close();
}

void testParser() {
    std::string testInput = R"(
        model TestModel {
            input: size=4
            layer: units=8, activation="relu"
            layer: units=2, activation="sigmoid"
        }
    )";

    std::istringstream inputStream(testInput);
    std::string line, modelName;
    int inputSize = 0;
    std::vector<std::pair<int, std::string>> layers;

    while (std::getline(inputStream, line)) {
        std::istringstream iss(line);
        std::string key;
        if (line.find("model") == 0) {
            iss >> key >> modelName;
        } else if (line.find("input") == 0) {
            iss >> key >> key >> key >> inputSize;
        } else if (line.find("layer") == 0) {
            int units;
            std::string activation;
            iss >> key >> key >> units >> key >> key >> activation;
            layers.emplace_back(units, activation);
        }
    }

    assert(modelName == "TestModel");
    assert(inputSize == 4);
    assert(layers.size() == 2);
    assert(layers[0].first == 8 && layers[0].second == "\"relu\"");
    assert(layers[1].first == 2 && layers[1].second == "\"sigmoid\"");
    std::cout << "Parser test passed.\n";
}

void testPythonTranspilation() {
    std::string modelName = "TestModel";
    int inputSize = 4;
    std::vector<std::pair<int, std::string>> layers = {
        {8, "\"relu\""},
        {2, "\"sigmoid\""}
    };

    std::ostringstream pythonCode;
    pythonCode << "import numpy as np\n\n";
    pythonCode << "class " << modelName << ":\n";
    pythonCode << "    def __init__(self):\n";
    for (size_t i = 0; i < layers.size(); ++i) {
        pythonCode << "        self.W" << i + 1 << " = np.random.rand(" << layers[i].first << ", " << (i == 0 ? inputSize : layers[i - 1].first) << ")\n";
        pythonCode << "        self.b" << i + 1 << " = np.random.rand(" << layers[i].first << ")\n";
    }
    pythonCode << "\n    def forward(self, x):\n";
    pythonCode << "        x = np.array(x)\n";
    for (size_t i = 0; i < layers.size(); ++i) {
        pythonCode << "        x = np.dot(self.W" << i + 1 << ", x) + self.b" << i + 1 << "\n";
        if (layers[i].second == "\"relu\"") {
            pythonCode << "        x = np.maximum(0, x)\n";
        } else if (layers[i].second == "\"sigmoid\"") {
            pythonCode << "        x = 1 / (1 + np.exp(-x))\n";
        }
    }
    pythonCode << "        return x\n";

    std::string expectedCode = R"(
import numpy as np

class TestModel:
    def __init__(self):
        self.W1 = np.random.rand(8, 4)
        self.b1 = np.random.rand(8)
        self.W2 = np.random.rand(2, 8)
        self.b2 = np.random.rand(2)

    def forward(self, x):
        x = np.array(x)
        x = np.dot(self.W1, x) + self.b1
        x = np.maximum(0, x)
        x = np.dot(self.W2, x) + self.b2
        x = 1 / (1 + np.exp(-x))
        return x
)";

    assert(pythonCode.str().find("class TestModel") != std::string::npos);
    assert(pythonCode.str().find("def forward") != std::string::npos);
    std::cout << "Python transpilation test passed.\n";
}

int main(int argc, char* argv[]) {
    if (argc == 2) {
        std::ifstream inputFile(argv[1]);
        if (!inputFile.is_open()) {
            std::cerr << "Error: Could not open file " << argv[1] << "\n";
            return 1;
        }

        std::string line, modelName;
        int inputSize = 0;
        std::vector<std::pair<int, std::string>> layers;

        while (std::getline(inputFile, line)) {
            std::istringstream iss(line);
            std::string key;
            if (line.find("model") == 0) {
                iss >> key >> modelName;
            } else if (line.find("input") == 0) {
                iss >> key >> key >> key >> inputSize;
            } else if (line.find("layer") == 0) {
                int units;
                std::string activation;
                iss >> key >> key >> units >> key >> key >> activation;
                layers.emplace_back(units, activation);
            }
        }

        inputFile.close();

        if (!modelName.empty() && inputSize > 0 && !layers.empty()) {
            generateModelClass(modelName, inputSize, layers);
            std::cout << "Model class generated successfully: " << modelName << ".cpp\n";
        } else {
            std::cerr << "Error: Invalid input format.\n";
            return 1;
        }
    } else {
        testParser();
        testPythonTranspilation();
    }

    return 0;
}
