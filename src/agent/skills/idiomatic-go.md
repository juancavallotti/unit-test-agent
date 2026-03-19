# Go Unit Tests

## File and Function Naming

```go
// file: auth_test.go
package auth_test

func TestFunctionName(t *testing.T) {}
```

---

**IMPORTANT**: We are already on the main package's working directory. Please read and create test files 
using ./ as base path and only go one level deep if you must test inside a subfolder.


## Table-Driven Tests

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name    string
        a, b    int
        want    int
        wantErr bool
    }{
        {name: "positive numbers", a: 1, b: 2, want: 3},
        {name: "negative numbers", a: -1, b: -2, want: -3},
        {name: "overflow", a: math.MaxInt64, b: 1, wantErr: true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Add(tt.a, tt.b)
            if (err != nil) != tt.wantErr {
                t.Fatalf("got err=%v, wantErr=%v", err, tt.wantErr)
            }
            if got != tt.want {
                t.Errorf("got %d, want %d", got, tt.want)
            }
        })
    }
}
```

---

## Fatalf vs Errorf

```go
result, err := DoSomething()
if err != nil {
    t.Fatalf("unexpected error: %v", err) // stop — no point continuing
}
if result.Name != "alice" {
    t.Errorf("got %q, want %q", result.Name, "alice") // continue — collect all failures
}
```

---

## Helper Functions

```go
func assertUserEqual(t *testing.T, got, want *User) {
    t.Helper() // stack trace points to caller, not here
    if got.Email != want.Email {
        t.Errorf("email: got %q, want %q", got.Email, want.Email)
    }
}
```

---

## Fakes

```go
type fakeStore struct {
    data map[string]*User
    err  error
}

func (f *fakeStore) GetUser(id string) (*User, error) {
    return f.data[id], f.err
}

func TestService(t *testing.T) {
    store := &fakeStore{
        data: map[string]*User{"1": {Email: "alice@example.com"}},
    }
    svc := NewService(store)
    // ...
}
```

---

## HTTP Handlers

```go
func TestHandler(t *testing.T) {
    req := httptest.NewRequest(http.MethodPost, "/users", strings.NewReader(`{"name":"alice"}`))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()

    MyHandler(w, req)

    if w.Code != http.StatusCreated {
        t.Errorf("got %d, want %d", w.Code, http.StatusCreated)
    }
}
```

---

## Cleanup

```go
func TestSomething(t *testing.T) {
    t.Cleanup(func() {
        // runs after test, even on failure
    })
}
```