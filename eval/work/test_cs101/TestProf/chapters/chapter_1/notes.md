# Chapter 1: Introduction to C++

## 1.1 Variables and Data Types

In C++, variables must be declared before use. Each variable has a type that determines what kind of data it can hold.

### Basic Types
- `int` — integer numbers (e.g., 42, -7)
- `double` — floating-point numbers (e.g., 3.14)
- `char` — single characters (e.g., 'A')
- `bool` — true or false
- `string` — text (requires `#include <string>`)

### Declaration and Initialization
```cpp
int age = 20;
double gpa = 3.5;
char grade = 'A';
bool passed = true;
string name = "Alice";
```

### Type Conversion
Implicit conversion happens automatically (e.g., `int` to `double`). Explicit casting uses `static_cast<type>(value)`.

```cpp
int x = 7;
double y = x;           // implicit: 7.0
int z = static_cast<int>(3.14);  // explicit: 3
```

**Warning**: Converting `double` to `int` truncates (does NOT round).

## 1.2 Control Flow

### if/else
```cpp
if (score >= 90) {
    grade = 'A';
} else if (score >= 80) {
    grade = 'B';
} else {
    grade = 'C';
}
```

### Loops
**for loop** — when you know the count:
```cpp
for (int i = 0; i < 10; i++) {
    cout << i << endl;
}
```

**while loop** — when you don't know the count:
```cpp
while (input != 0) {
    sum += input;
    cin >> input;
}
```

**do-while** — executes at least once:
```cpp
do {
    cin >> input;
} while (input < 0);
```

### Common Pitfall
Using `=` instead of `==` in conditions:
```cpp
if (x = 5)   // WRONG: assigns 5 to x, always true
if (x == 5)  // CORRECT: compares x to 5
```

## 1.3 Functions

### Function Declaration
```cpp
return_type function_name(parameter_type param) {
    // body
    return value;
}
```

### Example
```cpp
int add(int a, int b) {
    return a + b;
}

void printMessage(string msg) {
    cout << msg << endl;
}
```

### Pass by Value vs Pass by Reference
- **By value**: function gets a copy. Changes don't affect original.
- **By reference** (`&`): function gets the original. Changes affect it.

```cpp
void doubleIt(int& x) {   // reference
    x = x * 2;
}

int main() {
    int num = 5;
    doubleIt(num);  // num is now 10
}
```

### Default Parameters
```cpp
void greet(string name = "World") {
    cout << "Hello, " << name << endl;
}
greet();         // "Hello, World"
greet("Alice");  // "Hello, Alice"
```
