import 'package:flutter/material.dart';

class TopSnackBar {
  static void show(BuildContext context, String message, {Color? color, IconData? icon}) {
    final overlay = Overlay.of(context);
    late OverlayEntry entry;

    entry = OverlayEntry(
      builder: (context) {
        return _TopToastWidget(
          message: message,
          color: color,
          icon: icon,
          onDismiss: () {
            if (entry.mounted) {
              entry.remove();
            }
          },
        );
      },
    );

    overlay.insert(entry);
  }

  static void showSuccess(BuildContext context, String message) {
    show(
      context, 
      message, 
      color: Colors.green.shade600, 
      icon: Icons.check_circle_outline,
    );
  }

  static void showError(BuildContext context, String message) {
    show(
      context, 
      message, 
      color: Colors.red.shade600, 
      icon: Icons.error_outline,
    );
  }

  static void showInfo(BuildContext context, String message) {
    show(
      context, 
      message, 
      color: Colors.blue.shade600, 
      icon: Icons.info_outline,
    );
  }
}

class _TopToastWidget extends StatefulWidget {
  final String message;
  final Color? color;
  final IconData? icon;
  final VoidCallback onDismiss;

  const _TopToastWidget({
    required this.message,
    this.color,
    this.icon,
    required this.onDismiss,
  });

  @override
  State<_TopToastWidget> createState() => _TopToastWidgetState();
}

class _TopToastWidgetState extends State<_TopToastWidget> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _yAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );

    _yAnimation = Tween<double>(begin: -80, end: 0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _controller.forward();

    // Auto dismiss after 3 seconds
    Future.delayed(const Duration(seconds: 3)).then((_) {
      if (mounted) {
        _dismiss();
      }
    });
  }

  void _dismiss() async {
    if (mounted && _controller.isAnimating == false) {
      await _controller.reverse();
      widget.onDismiss();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    
    return Positioned(
      top: 40,
      left: (width - 380) / 2, // Centered
      child: Material(
        color: Colors.transparent,
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return Transform.translate(
              offset: Offset(0, _yAnimation.value),
              child: Opacity(
                opacity: _fadeAnimation.value,
                child: child,
              ),
            );
          },
          child: Container(
            width: 380,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(12),
              border: Border(
                left: BorderSide(
                  color: widget.color ?? Colors.blue,
                  width: 4,
                ),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 16,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              children: [
                Icon(
                  widget.icon ?? Icons.info_outline,
                  color: widget.color ?? Colors.blue,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.message,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurface,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: Icon(
                    Icons.close, 
                    size: 16,
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                  ),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  onPressed: _dismiss,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
