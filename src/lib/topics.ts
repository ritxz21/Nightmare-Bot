export interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string;
  coreConcepts: string[];
}

export const TOPICS: Topic[] = [
  {
    id: "neural-networks",
    title: "Neural Networks",
    description: "Backpropagation, gradient descent, activation functions, loss optimization, and architectures.",
    icon: "🧠",
    coreConcepts: [
      "Neurons & Layers",
      "Activation Functions",
      "Backpropagation",
      "Gradient Descent",
      "Loss Functions",
      "Overfitting & Regularization",
      "Learning Rate",
      "Weight Initialization",
      "Batch Normalization",
      "Convolutional Layers",
    ],
  },
  {
    id: "databases",
    title: "Databases",
    description: "Indexing, normalization, ACID, query optimization, and distributed storage.",
    icon: "🗄️",
    coreConcepts: [
      "ACID Properties",
      "Normalization",
      "Indexing",
      "Query Optimization",
      "Joins",
      "Transactions",
      "CAP Theorem",
      "Sharding",
      "Replication",
      "SQL vs NoSQL",
    ],
  },
  {
    id: "system-design",
    title: "System Design",
    description: "Load balancing, caching, microservices, consistency models, and scalability patterns.",
    icon: "⚙️",
    coreConcepts: [
      "Load Balancing",
      "Caching Strategies",
      "Microservices",
      "API Gateway",
      "Message Queues",
      "Consistency Models",
      "Database Partitioning",
      "CDN",
      "Rate Limiting",
      "Horizontal vs Vertical Scaling",
    ],
  },
];
