from pathlib import Path
import ast
import io
import tokenize

base = Path(r"c:\Users\Admin\Downloads\Automatic-Panorama-main\Automatic-Panorama-main\scripts")

for path in base.glob("*.py"):
    src = path.read_text(encoding="utf-8")
    tree = ast.parse(src)
    to_remove = []

    def visit(node):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if node.body and isinstance(node.body[0], ast.Expr):
                expr = node.body[0]
                if isinstance(expr.value, ast.Constant) and isinstance(expr.value.value, str):
                    to_remove.append((expr.lineno, expr.end_lineno, expr.col_offset, expr.end_col_offset))
        for child in ast.iter_child_nodes(node):
            visit(child)

    visit(tree)

    lines = src.splitlines(keepends=True)
    out = []
    removed = set()
    for start, end, _, _ in to_remove:
        for i in range(start - 1, end):
            removed.add(i)
    for i, line in enumerate(lines):
        if i in removed:
            continue
        out.append(line)

    stripped = "".join(out)
    tokens = list(tokenize.generate_tokens(io.StringIO(stripped).readline))
    cleaned = []
    for tok in tokens:
        if tok.type == tokenize.COMMENT:
            continue
        cleaned.append(tok)

    new_src = tokenize.untokenize(cleaned)
    path.write_text(new_src, encoding="utf-8")
    print(f"cleaned {path.name}")
