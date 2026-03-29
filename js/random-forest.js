// ========================================================================
// random-forest.js - Implementasi Algoritma Random Forest
// ========================================================================

class DecisionTreeNode {
    constructor() {
        this.featureIndex = null;
        this.threshold = null;
        this.left = null;
        this.right = null;
        this.prediction = null;
        this.giniImportance = 0;
    }
}

class DecisionTree {
    constructor(maxDepth = 5, minSamples = 2, featureSubsetSize = null) {
        this.maxDepth = maxDepth;
        this.minSamples = minSamples;
        this.featureSubsetSize = featureSubsetSize;
        this.root = null;
        this.featureImportances = null;
    }

    // Gini impurity
    gini(labels) {
        const n = labels.length;
        if (n === 0) return 0;
        const counts = {};
        labels.forEach(l => counts[l] = (counts[l] || 0) + 1);
        let impurity = 1;
        for (const c of Object.values(counts)) {
            const p = c / n;
            impurity -= p * p;
        }
        return impurity;
    }

    // Majority class
    majorityClass(labels) {
        const counts = {};
        labels.forEach(l => counts[l] = (counts[l] || 0) + 1);
        let best = null, bestCount = -1;
        for (const [cls, cnt] of Object.entries(counts)) {
            if (cnt > bestCount) { best = parseInt(cls); bestCount = cnt; }
        }
        return best;
    }

    // Random subset of feature indices
    randomFeatureSubset(numFeatures) {
        const size = this.featureSubsetSize || Math.floor(Math.sqrt(numFeatures));
        const indices = Array.from({ length: numFeatures }, (_, i) => i);
        // Fisher-Yates shuffle
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        return indices.slice(0, size);
    }

    // Find best split for given data
    findBestSplit(data, labels, featureIndices) {
        let bestGini = Infinity, bestFeature = null, bestThreshold = null;
        const n = labels.length;
        const parentGini = this.gini(labels);

        for (const fi of featureIndices) {
            // Get unique sorted values for this feature
            const values = [...new Set(data.map(row => row[fi]))].sort((a, b) => a - b);
            for (let vi = 0; vi < values.length - 1; vi++) {
                const threshold = (values[vi] + values[vi + 1]) / 2;
                const leftIdx = [], rightIdx = [];
                for (let i = 0; i < n; i++) {
                    if (data[i][fi] <= threshold) leftIdx.push(i);
                    else rightIdx.push(i);
                }
                if (leftIdx.length < this.minSamples || rightIdx.length < this.minSamples) continue;

                const leftLabels = leftIdx.map(i => labels[i]);
                const rightLabels = rightIdx.map(i => labels[i]);
                const weightedGini = (leftLabels.length * this.gini(leftLabels) +
                    rightLabels.length * this.gini(rightLabels)) / n;

                if (weightedGini < bestGini) {
                    bestGini = weightedGini;
                    bestFeature = fi;
                    bestThreshold = threshold;
                }
            }
        }
        return { feature: bestFeature, threshold: bestThreshold, improvement: parentGini - bestGini };
    }

    // Build tree recursively
    buildTree(data, labels, depth) {
        const node = new DecisionTreeNode();

        // Terminal conditions
        if (depth >= this.maxDepth || labels.length <= this.minSamples || this.gini(labels) === 0) {
            node.prediction = this.majorityClass(labels);
            return node;
        }

        const featureIndices = this.randomFeatureSubset(data[0].length);
        const split = this.findBestSplit(data, labels, featureIndices);

        if (split.feature === null) {
            node.prediction = this.majorityClass(labels);
            return node;
        }

        node.featureIndex = split.feature;
        node.threshold = split.threshold;
        node.giniImportance = split.improvement * labels.length;

        // Accumulate feature importance
        this.featureImportances[split.feature] += split.improvement * labels.length;

        const leftData = [], leftLabels = [], rightData = [], rightLabels = [];
        for (let i = 0; i < data.length; i++) {
            if (data[i][split.feature] <= split.threshold) {
                leftData.push(data[i]); leftLabels.push(labels[i]);
            } else {
                rightData.push(data[i]); rightLabels.push(labels[i]);
            }
        }

        node.left = this.buildTree(leftData, leftLabels, depth + 1);
        node.right = this.buildTree(rightData, rightLabels, depth + 1);
        return node;
    }

    train(data, labels) {
        this.featureImportances = new Array(data[0].length).fill(0);
        this.root = this.buildTree(data, labels, 0);
    }

    predict(sample) {
        let node = this.root;
        while (node.prediction === null) {
            if (sample[node.featureIndex] <= node.threshold) {
                node = node.left;
            } else {
                node = node.right;
            }
        }
        return node.prediction;
    }
}

class RandomForest {
    constructor(numTrees = 10, maxDepth = 5, featureSubsetSize = null) {
        this.numTrees = numTrees;
        this.maxDepth = maxDepth;
        this.featureSubsetSize = featureSubsetSize;
        this.trees = [];
        this.featureImportances = null;
        this.accuracy = null;
        this.trained = false;
    }

    // Bootstrap sample (sampling with replacement)
    bootstrap(data, labels) {
        const n = data.length;
        const sampledData = [], sampledLabels = [], oobIndices = new Set();
        const usedIndices = new Set();

        for (let i = 0; i < n; i++) {
            const idx = Math.floor(Math.random() * n);
            sampledData.push([...data[idx]]);
            sampledLabels.push(labels[idx]);
            usedIndices.add(idx);
        }

        for (let i = 0; i < n; i++) {
            if (!usedIndices.has(i)) oobIndices.add(i);
        }

        return { sampledData, sampledLabels, oobIndices };
    }

    train(data, labels) {
        this.trees = [];
        const numFeatures = data[0].length;
        const allImportances = new Array(numFeatures).fill(0);

        for (let t = 0; t < this.numTrees; t++) {
            const { sampledData, sampledLabels } = this.bootstrap(data, labels);
            const tree = new DecisionTree(this.maxDepth, 2, this.featureSubsetSize);
            tree.train(sampledData, sampledLabels);
            this.trees.push(tree);

            // Accumulate feature importances
            for (let f = 0; f < numFeatures; f++) {
                allImportances[f] += tree.featureImportances[f];
            }
        }

        // Normalize feature importances
        const totalImportance = allImportances.reduce((a, b) => a + b, 0);
        this.featureImportances = allImportances.map(v =>
            totalImportance > 0 ? v / totalImportance : 1 / numFeatures
        );

        // Calculate training accuracy
        let correct = 0;
        for (let i = 0; i < data.length; i++) {
            if (this.predict(data[i]) === labels[i]) correct++;
        }
        this.accuracy = correct / data.length;
        this.trained = true;

        return {
            accuracy: this.accuracy,
            featureImportances: this.featureImportances,
            numTrees: this.numTrees
        };
    }

    predict(sample) {
        const votes = {};
        for (const tree of this.trees) {
            const prediction = tree.predict(sample);
            votes[prediction] = (votes[prediction] || 0) + 1;
        }
        let best = null, bestCount = -1;
        for (const [cls, cnt] of Object.entries(votes)) {
            if (cnt > bestCount) { best = parseInt(cls); bestCount = cnt; }
        }
        return best;
    }

    predictProba(sample) {
        const votes = { 1: 0, 2: 0, 3: 0, 4: 0 };
        for (const tree of this.trees) {
            const prediction = tree.predict(sample);
            votes[prediction]++;
        }
        const total = this.trees.length;
        const proba = {};
        for (const [cls, cnt] of Object.entries(votes)) {
            proba[cls] = cnt / total;
        }
        return proba;
    }

    getConfusionMatrix(data, labels) {
        const classes = [1, 2, 3, 4];
        const matrix = {};
        classes.forEach(actual => {
            matrix[actual] = {};
            classes.forEach(pred => matrix[actual][pred] = 0);
        });

        for (let i = 0; i < data.length; i++) {
            const pred = this.predict(data[i]);
            const actual = labels[i];
            matrix[actual][pred]++;
        }
        return matrix;
    }

    getClassificationReport(data, labels) {
        const classes = [1, 2, 3, 4];
        const matrix = this.getConfusionMatrix(data, labels);
        const report = {};

        classes.forEach(cls => {
            let tp = matrix[cls][cls];
            let fp = 0, fn = 0;
            classes.forEach(other => {
                if (other !== cls) {
                    fp += matrix[other][cls];
                    fn += matrix[cls][other];
                }
            });
            const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
            const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
            const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
            report[cls] = { precision, recall, f1, support: tp + fn };
        });

        return report;
    }
}
