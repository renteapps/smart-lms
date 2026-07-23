import os

filepath = "src/app/onboarding/page.tsx"
if os.path.exists(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    content = content.replace("bg-black", "bg-on-primary")
    with open(filepath, 'w') as f:
        f.write(content)
