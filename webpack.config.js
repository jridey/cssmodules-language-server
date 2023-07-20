const path = require('path');

module.exports = {
  entry: './src/cli.ts', // Entry point of your TypeScript project
  output: {
    filename: 'server.js', // Output bundle filename
    path: path.resolve(__dirname, 'dist'), // Output directory
    globalObject: 'this'
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      }
    ]
  }
};
