import os

files_to_update = [
    "src/app/onboarding/page.tsx",
    "src/app/admin/trilhas/curadoria/page.tsx",
    "src/app/admin/trilhas/questionario/page.tsx",
    "src/components/LessonCard.tsx"
]

replacements = [
    ("[#00E59B]", "primary"),
    ("rgba(0,229,155", "rgba(59,130,246"),
    ("rgba(0, 229, 155", "rgba(59, 130, 246"),
    ("[#00c484]", "primary-active"),
    ("text-black", "text-on-primary") # since primary button text is on-primary
]

for filepath in files_to_update:
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
        
        for old, new in replacements:
            content = content.replace(old, new)
            
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"File not found: {filepath}")

