import os
import re

target_dir = r"c:\Users\Anahi\PRUEBAS_30728\frontend\lib"

url_pattern = re.compile(r"'http://(?:localhost|127\.0\.0\.1):8000/api/v1(.*?)'")
import_statement = "import 'package:frontend/core/config/api_config.dart';"

for root, _, files in os.walk(target_dir):
    for file in files:
        if file.endswith(".dart"):
            if file == "api_config.dart":
                continue
                
            filepath = os.path.join(root, file)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
            except Exception as e:
                continue
                
            if url_pattern.search(content):
                # Replace the URLs
                new_content = url_pattern.sub(r"'${ApiConfig.baseUrl}/api/v1\1'", content)
                
                # Add import if missing
                if import_statement not in new_content:
                    # Find last import to append after, or first to prepend
                    imports = [m for m in re.finditer(r"^import\s+['\"].*?['\"];", new_content, re.MULTILINE)]
                    if imports:
                        last_import = imports[-1]
                        new_content = new_content[:last_import.end()] + "\n" + import_statement + new_content[last_import.end():]
                    else:
                        new_content = import_statement + "\n\n" + new_content
                        
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated: {filepath}")

print("Reemplazo completado.")
