import os
import re

components = ["school.js", "instructor.js", "car.js", "package.js"]
base_dir = "renderer/component/setup"

for comp in components:
    filepath = os.path.join(base_dir, comp)
    with open(filepath, "r") as f:
        content = f.read()
    
    # regex to remove AlertDialog imports block
    content = re.sub(r'import\s+\{([^}]*AlertDialog[^}]*)\}\s+from\s+"@/components/ui/alert-dialog";', '', content, flags=re.DOTALL)
    
    with open(filepath, "w") as f:
        f.write(content)

