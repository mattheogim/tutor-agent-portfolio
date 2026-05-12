# Section Plan — Chapter 1: Introduction to C++

## Teaching Order

### 1.1 Variables and Data Types
- **Key Concepts**: variable declaration, basic types (int, double, char, bool, string), initialization, type conversion, static_cast, truncation
- **Prerequisites**: None (first chapter)
- **Approach**: Start with concrete examples. Show each type with real-world analogy.
- **Estimated Time**: 15 min
- **Practice Focus**: type conversion edge cases (double→int truncation)

### 1.2 Control Flow
- **Key Concepts**: if/else, for loop, while loop, do-while, == vs = pitfall
- **Prerequisites**: 1.1 (variables)
- **Approach**: Build complexity gradually. if → if/else → nested. Same for loops.
- **Estimated Time**: 20 min
- **Practice Focus**: loop tracing, off-by-one errors, = vs == bug

### 1.3 Functions
- **Key Concepts**: function declaration, return types, void, pass-by-value, pass-by-reference, default parameters
- **Prerequisites**: 1.1, 1.2
- **Approach**: Start with simple functions, then introduce reference parameters as "upgrading" from value.
- **Estimated Time**: 25 min
- **Practice Focus**: pass-by-value vs pass-by-reference confusion, predicting output with reference params

## Chapter Summary
- Total Sections: 3
- Total Estimated Time: 60 min
- Key Difficulty: pass-by-reference (most students confuse with pass-by-value)
