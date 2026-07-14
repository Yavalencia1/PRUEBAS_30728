import 'dart:io';

void main() {
  final targetDir = Directory('c:/Users/Anahi/PRUEBAS_30728/frontend/lib');
  final urlPattern = RegExp(r"'http://(?:localhost|127\.0\.0\.1):8000/api/v1(.*?)'");
  final importStatement = "import 'package:frontend/core/config/api_config.dart';";

  final files = targetDir.listSync(recursive: true);
  for (var file in files) {
    if (file is File && file.path.endsWith('.dart') && !file.path.endsWith('api_config.dart')) {
      try {
        var content = file.readAsStringSync();
        if (urlPattern.hasMatch(content)) {
          content = content.replaceAllMapped(urlPattern, (match) {
            final suffix = match.group(1) ?? '';
            return "'\${ApiConfig.baseUrl}/api/v1$suffix'";
          });

          if (!content.contains(importStatement)) {
            final importPattern = RegExp('^import\\s+[\\\'\\"].*?[\\\'\\"];', multiLine: true);
            final matches = importPattern.allMatches(content);
            if (matches.isNotEmpty) {
              final lastMatch = matches.last;
              content = content.substring(0, lastMatch.end) + '\n' + importStatement + content.substring(lastMatch.end);
            } else {
              content = importStatement + '\n\n' + content;
            }
          }

          file.writeAsStringSync(content);
          print('Updated: ${file.path}');
        }
      } catch (e) {
        // ignore
      }
    }
  }
  print('Reemplazo completado.');
}
