# Quiz 1 — test_cs101 / TestProf

## Question 1 (2 pts)
What is the output of the following code?
```cpp
int x = 10;
double y = x / 3;
cout << y;
```
**Answer**: 3 (integer division, then implicit conversion to double → 3.0, but displayed as 3)

## Question 2 (2 pts)
What is the output?
```cpp
for (int i = 1; i <= 5; i++) {
    if (i % 2 == 0) continue;
    cout << i << " ";
}
```
**Answer**: 1 3 5

## Question 3 (3 pts)
What is the output?
```cpp
void modify(int a, int& b) {
    a = a + 10;
    b = b + 10;
}

int main() {
    int x = 5, y = 5;
    modify(x, y);
    cout << x << " " << y;
}
```
**Answer**: 5 15 (x passed by value — unchanged, y passed by reference — changed)

## Question 4 (3 pts)
True or False: `static_cast<int>(4.9)` returns 5.
**Answer**: False — it returns 4 (truncation, not rounding).
