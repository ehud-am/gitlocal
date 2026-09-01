"""Sample file demonstrating GitLocal's syntax-highlighted code preview."""


def fibonacci(n: int) -> int:
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)


if __name__ == "__main__":
    for i in range(10):
        print(fibonacci(i))
