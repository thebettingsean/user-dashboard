# The Betting Insider - Complete Style Guide

This document contains the complete design system extracted from the web application, formatted for implementation in Swift/SwiftUI.

---

## 1. Color Palette

### Primary Colors
```swift
// Blue (Primary)
let blue = Color(hex: "#3b82f6")        // --b
let blueLight = Color(hex: "#60a5fa")    // --bl

// Green (Success)
let green = Color(hex: "#10b981")       // --g

// Orange (Warning)
let orange = Color(hex: "#f59e0b")      // --o

// Red (Error)
let red = Color(hex: "#ef4444")         // --r

// White
let white = Color(hex: "#ffffff")       // --w
```

### Dark Background Colors
```swift
// Dark shades
let dark1 = Color(hex: "#0f172a")       // --d1
let dark2 = Color(hex: "#1e293b")       // --d2
let dark3 = Color(hex: "#334155")       // --d3

// Background gradient stops
let bgBlack = Color(hex: "#000000")
let bgTransition = Color(hex: "#0a1018")
let bgDarkBlue = Color(hex: "#0e172a")
```

### Text Colors
```swift
// Primary text
let textPrimary = Color.white

// Secondary text
let textSecondary = Color(hex: "#e5e7eb")      // rgba(229, 231, 235, 1)
let textTertiary = Color(hex: "#9ca3af")       // rgba(156, 163, 175, 1)

// Text with opacity
let textWhite60 = Color.white.opacity(0.6)     // rgba(255, 255, 255, 0.6)
let textWhite70 = Color.white.opacity(0.7)     // rgba(255, 255, 255, 0.7)
let textWhite80 = Color.white.opacity(0.8)     // rgba(255, 255, 255, 0.8)
let textWhite85 = Color.white.opacity(0.85)    // rgba(255, 255, 255, 0.85)
```

### Accent Colors
```swift
// Purple/Violet
let purple = Color(hex: "#8b5cf6")              // rgba(139, 92, 246, 1)
let purpleLight = Color(hex: "#a78bfa")
let indigo = Color(hex: "#6366f1")              // rgba(99, 102, 241, 1)

// Additional accent colors
let yellow = Color(hex: "#facc15")
let greenLight = Color(hex: "#34d399")
let pink = Color(hex: "#fb7185")
```

---

## 2. Typography

### Font Families
```swift
// Primary font stack
let primaryFont = Font.system(.body, design: .default)
// System fonts: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif

// Monospace font (for code/floating text)
let monospaceFont = Font.system(.body, design: .monospaced)
// 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Fira Mono', 'Droid Sans Mono', 'Courier New', monospace

// Inter font (when available)
let interFont = Font.custom("Inter", size: 16)
```

### Font Sizes
```swift
// Base sizes
let fontSizeXS = 0.625rem      // 10px
let fontSizeSM = 0.75rem       // 12px
let fontSizeBase = 0.875rem    // 14px
let fontSizeMD = 0.9375rem     // 15px
let fontSizeLG = 1rem          // 16px
let fontSizeXL = 1.125rem      // 18px
let fontSize2XL = 1.25rem      // 20px
let fontSize3XL = 1.5rem        // 24px
let fontSize4XL = 2rem          // 32px
let fontSize5XL = 2.5rem        // 40px
let fontSize6XL = 3rem          // 48px
let fontSize7XL = 3.5rem        // 56px
let fontSize8XL = 4rem          // 64px
let fontSize9XL = 4.5rem         // 72px
let fontSize10XL = 6rem          // 96px

// Responsive clamp sizes (use GeometryReader in SwiftUI)
// Hero title: clamp(2rem, 5vw, 4rem) → 32px to 64px
// Hero title large: clamp(3rem, 6vw, 6rem) → 48px to 96px
// Section title: clamp(2.5rem, 5vw, 4rem) → 40px to 64px
```

### Font Weights
```swift
let fontWeight400 = Font.Weight.regular    // 400
let fontWeight500 = Font.Weight.medium     // 500
let fontWeight600 = Font.Weight.semibold   // 600
let fontWeight700 = Font.Weight.bold       // 700
let fontWeight800 = Font.Weight.heavy      // 800
let fontWeight900 = Font.Weight.black      // 900
```

### Line Heights
```swift
let lineHeightTight = 1.1
let lineHeightNormal = 1.2
let lineHeightRelaxed = 1.4
let lineHeightLoose = 1.5
let lineHeightVeryLoose = 1.6
```

### Letter Spacing
```swift
let letterSpacingTight = -0.02      // For large headings
let letterSpacingNormal = 0.0
let letterSpacingWide = 0.02
let letterSpacingWider = 0.05
let letterSpacingWidest = 0.1       // For uppercase labels
let letterSpacingUltraWide = 0.12
```

### Text Styles
```swift
// Hero Title
let heroTitleStyle = TextStyle(
    size: .clamp(min: 32, preferred: 5vw, max: 64),
    weight: .black,
    lineHeight: 1.1,
    letterSpacing: -0.02,
    color: .white
)

// Hero Subtitle
let heroSubtitleStyle = TextStyle(
    size: .clamp(min: 16, preferred: 2.5vw, max: 32),
    weight: .semibold,
    lineHeight: 1.6,
    color: textSecondary
)

// Section Title
let sectionTitleStyle = TextStyle(
    size: .clamp(min: 40, preferred: 5vw, max: 64),
    weight: .black,
    lineHeight: 1.2,
    letterSpacing: -0.01,
    color: .white
)

// Body Text
let bodyTextStyle = TextStyle(
    size: 16,
    weight: .regular,
    lineHeight: 1.6,
    color: textSecondary
)

// Label (Uppercase)
let labelStyle = TextStyle(
    size: 14,
    weight: .semibold,
    letterSpacing: 0.1,
    textTransform: .uppercase,
    color: blueLight
)

// Small Text
let smallTextStyle = TextStyle(
    size: 12,
    weight: .regular,
    color: textTertiary
)
```

---

## 3. Spacing System

### Base Spacing Units
```swift
// Using 4px base unit (0.25rem)
let spacing0 = 0
let spacing1 = 4      // 0.25rem
let spacing2 = 8      // 0.5rem
let spacing3 = 12     // 0.75rem
let spacing4 = 16     // 1rem
let spacing5 = 20     // 1.25rem
let spacing6 = 24     // 1.5rem
let spacing8 = 32     // 2rem
let spacing10 = 40    // 2.5rem
let spacing12 = 48    // 3rem
let spacing16 = 64    // 4rem
let spacing20 = 80    // 5rem
let spacing24 = 96    // 6rem
let spacing32 = 128   // 8rem
```

### Common Spacing Patterns
```swift
// Padding
let paddingCard = 24              // 1.5rem
let paddingCardLarge = 32         // 2rem
let paddingSection = 64           // 4rem
let paddingSectionMobile = 32     // 2rem
let paddingButton = EdgeInsets(top: 12, leading: 24, bottom: 12, trailing: 24)
let paddingButtonLarge = EdgeInsets(top: 16, leading: 32, bottom: 16, trailing: 32)

// Gaps
let gapSmall = 8                  // 0.5rem
let gapMedium = 16                 // 1rem
let gapLarge = 24                  // 1.5rem
let gapXLarge = 32                 // 2rem
let gapXXLarge = 48                // 3rem

// Margins
let marginSection = 80             // 5rem
let marginCard = 16                // 1rem
```

---

## 4. Border Radius

```swift
let radiusSmall = 8        // 0.5rem
let radiusMedium = 12       // 0.75rem
let radiusLarge = 16        // 1rem
let radiusXL = 20            // 1.25rem
let radiusXXL = 24           // 1.5rem
let radiusPill = 60          // 3.75rem (for navbar)
let radiusFull = 999         // Full circle
```

---

## 5. Glassmorphism Effects

### Base Glass Surface
```swift
struct GlassSurface: ViewModifier {
    let intensity: GlassIntensity
    
    enum GlassIntensity {
        case subtle      // rgba(255, 255, 255, 0.02)
        case light       // rgba(255, 255, 255, 0.05)
        case medium      // rgba(255, 255, 255, 0.08)
        case strong      // rgba(255, 255, 255, 0.1)
    }
    
    func body(content: Content) -> some View {
        content
            .background(
                GlassBackground(intensity: intensity)
            )
    }
}

struct GlassBackground: View {
    let intensity: GlassSurface.GlassIntensity
    
    var body: some View {
        ZStack {
            // Base background
            Color.white.opacity(intensity.opacity)
            
            // Blur effect
            .background(.ultraThinMaterial)
            
            // Border
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.white.opacity(0.08), lineWidth: 0.5)
            )
            
            // Shadow
            .shadow(color: .black.opacity(0.37), radius: 16, x: 0, y: 8)
        }
    }
}

extension GlassSurface.GlassIntensity {
    var opacity: Double {
        switch self {
        case .subtle: return 0.02
        case .light: return 0.05
        case .medium: return 0.08
        case .strong: return 0.1
        }
    }
}
```

### Glass Card Properties
```swift
struct GlassCardStyle {
    // Background
    let backgroundOpacity: Double = 0.05
    let blurRadius: Double = 30
    let saturation: Double = 180
    
    // Border
    let borderWidth: Double = 0.5
    let borderColor = Color.white.opacity(0.08)
    
    // Shadow
    let shadowColor = Color.black.opacity(0.37)
    let shadowRadius: Double = 16
    let shadowX: Double = 0
    let shadowY: Double = 8
    
    // Hover state
    let hoverBackgroundOpacity: Double = 0.08
    let hoverBorderOpacity: Double = 0.12
    let hoverShadowRadius: Double = 24
    let hoverShadowY: Double = 12
    let hoverTransformY: Double = -4
}
```

### Advanced Glass Effect (with layers)
```swift
struct AdvancedGlassCard: View {
    var body: some View {
        ZStack {
            // Layer 1: Blur filter
            RoundedRectangle(cornerRadius: 22)
                .fill(.ultraThinMaterial)
                .blur(radius: 18)
            
            // Layer 2: Overlay gradient
            RoundedRectangle(cornerRadius: 22)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(hex: "#0d1426").opacity(0.62),
                            Color(hex: "#080c18").opacity(0.4)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 22)
                        .stroke(Color(hex: "#5e6a86").opacity(0.22), lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.25), radius: 22, x: 0, y: -14, blur: 22)
                .shadow(color: .black.opacity(0.4), radius: 60, x: 0, y: 24)
            
            // Layer 3: Specular highlights
            RoundedRectangle(cornerRadius: 22)
                .fill(
                    RadialGradient(
                        colors: [
                            Color.white.opacity(0.12),
                            Color.clear
                        ],
                        center: UnitPoint(x: 0.2, y: 0.15),
                        startRadius: 0,
                        endRadius: 200
                    )
                )
                .blendMode(.screen)
                .opacity(0.55)
        }
    }
}
```

---

## 6. Buttons

### Primary Button
```swift
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(
                LinearGradient(
                    colors: [blue, blueLight],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(12)
            .shadow(color: blue.opacity(0.4), radius: 20, x: 0, y: 6)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: configuration.isPressed)
    }
}
```

### Glass Button
```swift
struct GlassButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(
                ZStack {
                    // Glass background
                    Color.white.opacity(0.05)
                        .background(.ultraThinMaterial)
                    
                    // Border
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.white.opacity(0.08), lineWidth: 0.5)
                }
            )
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.37), radius: 16, x: 0, y: 8)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .offset(y: configuration.isPressed ? 0 : -2)
            .animation(.easeInOut(duration: 0.3), value: configuration.isPressed)
    }
}
```

### Button Sizes
```swift
enum ButtonSize {
    case small
    case medium
    case large
    
    var padding: EdgeInsets {
        switch self {
        case .small:
            return EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16)
        case .medium:
            return EdgeInsets(top: 12, leading: 24, bottom: 12, trailing: 24)
        case .large:
            return EdgeInsets(top: 16, leading: 32, bottom: 16, trailing: 32)
        }
    }
    
    var fontSize: CGFloat {
        switch self {
        case .small: return 14
        case .medium: return 16
        case .large: return 18
        }
    }
}
```

### Button Variants
```swift
// Sign In Button
let signInButtonStyle = ButtonStyle(
    background: blue.opacity(0.2),
    border: blue.opacity(0.4),
    cornerRadius: 20,
    padding: EdgeInsets(top: 10, leading: 20, bottom: 10, trailing: 20)
)

// Submit Button
let submitButtonStyle = ButtonStyle(
    background: LinearGradient(colors: [blue, blueLight]),
    cornerRadius: 12,
    padding: EdgeInsets(top: 16, leading: 24, bottom: 16, trailing: 24),
    fontSize: 16,
    fontWeight: .bold,
    textTransform: .uppercase,
    letterSpacing: 0.1
)

// Email Button (Green)
let emailButtonStyle = ButtonStyle(
    background: LinearGradient(colors: [green, greenLight]),
    cornerRadius: 8,
    padding: EdgeInsets(top: 12, leading: 24, bottom: 12, trailing: 24)
)
```

---

## 7. Cards & Containers

### Base Card Style
```swift
struct CardStyle {
    let background = Color.white.opacity(0.05)
    let blurRadius: Double = 20
    let borderWidth: Double = 1
    let borderColor = Color.white.opacity(0.1)
    let cornerRadius: Double = 20
    let padding: EdgeInsets = EdgeInsets(top: 24, leading: 24, bottom: 24, trailing: 24)
    let shadowColor = Color.black.opacity(0.3)
    let shadowRadius: Double = 20
    let shadowY: Double = 10
}

// Card hover state
struct CardHoverStyle {
    let borderColor = blueLight.opacity(0.4)
    let transformY: Double = -5
    let shadowRadius: Double = 40
    let shadowY: Double = 20
}
```

### Form Card
```swift
struct FormCardStyle {
    let minHeight: Double = 160
    let padding: EdgeInsets = EdgeInsets(top: 24, leading: 24, bottom: 24, trailing: 24)
    let cornerRadius: Double = 20
    let background = Color.white.opacity(0.05)
    let borderColor = Color.white.opacity(0.1)
    
    // Error state
    let errorBorderColor = Color(hex: "#e74c3c")
    let errorShadowColor = Color(hex: "#e74c3c").opacity(0.3)
}
```

### Results Card
```swift
struct ResultsCardStyle {
    let cornerRadius: Double = 24
    let padding: EdgeInsets = EdgeInsets(top: 48, leading: 48, bottom: 48, trailing: 48)
    let maxWidth: Double = 1000
}
```

---

## 8. Input Fields

### Text Input Style
```swift
struct TextInputStyle {
    let padding: EdgeInsets = EdgeInsets(top: 10, leading: 14, bottom: 10, trailing: 14)
    let background = Color.white.opacity(0.05)
    let borderWidth: Double = 1
    let borderColor = Color.white.opacity(0.1)
    let cornerRadius: Double = 10
    let fontSize: CGFloat = 15
    let textColor = Color.white
    let placeholderColor = textTertiary
    
    // Focus state
    let focusBorderColor = blueLight
    
    // Error state
    let errorBorderColor = Color(hex: "#e74c3c")
}
```

### Select/Dropdown Style
```swift
struct SelectStyle {
    let padding: EdgeInsets = EdgeInsets(top: 10, leading: 14, bottom: 10, trailing: 40)
    let background = Color.white.opacity(0.05)
    let borderColor = Color.white.opacity(0.1)
    let cornerRadius: Double = 10
    let fontSize: CGFloat = 15
    let optionBackground = dark2
}
```

---

## 9. Background Gradients

### Main Background Gradient
```swift
let mainBackgroundGradient = LinearGradient(
    stops: [
        .init(color: bgBlack, location: 0.0),
        .init(color: bgTransition, location: 0.4),
        .init(color: bgDarkBlue, location: 1.0)
    ],
    startPoint: .topLeading,
    endPoint: .bottomTrailing
)
```

### Gradient Lines (Animated)
```swift
struct GradientLine {
    let colors: [Color] = [
        .clear,
        blue.opacity(0.08),
        purple.opacity(0.12),
        blue.opacity(0.1),
        purple.opacity(0.15),
        blue.opacity(0.1),
        purple.opacity(0.12),
        blue.opacity(0.08),
        .clear
    ]
    let height: Double = 60
    let blurRadius: Double = 15
}
```

### Floating Orbs
```swift
struct FloatingOrb {
    let size: CGSize
    let color: Color
    let opacity: Double
    let blurRadius: Double
    let position: CGPoint
    let animationDuration: Double
    
    static let orb1 = FloatingOrb(
        size: CGSize(width: 600, height: 600),
        color: blue,
        opacity: 0.35,
        blurRadius: 120,
        position: CGPoint(x: -0.1, y: 0.05),
        animationDuration: 25
    )
    
    static let orb2 = FloatingOrb(
        size: CGSize(width: 500, height: 500),
        color: purple,
        opacity: 0.3,
        blurRadius: 120,
        position: CGPoint(x: 0.95, y: 0.9),
        animationDuration: 30
    )
}
```

---

## 10. Shadows

```swift
struct ShadowStyles {
    // Card shadow
    static let card = Shadow(
        color: .black.opacity(0.3),
        radius: 20,
        x: 0,
        y: 10
    )
    
    // Card hover shadow
    static let cardHover = Shadow(
        color: .black.opacity(0.3),
        radius: 40,
        x: 0,
        y: 20
    )
    
    // Button shadow
    static let button = Shadow(
        color: blue.opacity(0.5),
        radius: 30,
        x: 0,
        y: 12
    )
    
    // Glass surface shadow
    static let glass = Shadow(
        color: .black.opacity(0.37),
        radius: 16,
        x: 0,
        y: 8
    )
    
    // Dropdown shadow
    static let dropdown = Shadow(
        color: .black.opacity(0.6),
        radius: 32,
        x: 0,
        y: 8
    )
    
    // Inset shadow (for glass effect)
    static let inset = Shadow(
        color: .white.opacity(0.2),
        radius: 1,
        x: 0,
        y: 1,
        isInset: true
    )
}
```

---

## 11. Animations

### Animation Durations
```swift
let animationFast = 0.2
let animationMedium = 0.3
let animationSlow = 0.4
let animationVerySlow = 0.8
```

### Animation Curves
```swift
let easeInOut = Animation.easeInOut(duration: 0.3)
let easeOut = Animation.easeOut(duration: 0.3)
let spring = Animation.spring(response: 0.3, dampingFraction: 0.7)
```

### Keyframe Animations
```swift
// Float animation (for orbs)
struct FloatAnimation {
    static func create(duration: Double) -> Animation {
        Animation.easeInOut(duration: duration)
            .repeatForever(autoreverses: true)
    }
}

// Fade in up
struct FadeInUp: ViewModifier {
    @State private var opacity: Double = 0
    @State private var offset: CGFloat = 20
    
    func body(content: Content) -> some View {
        content
            .opacity(opacity)
            .offset(y: offset)
            .onAppear {
                withAnimation(.easeOut(duration: 0.6)) {
                    opacity = 1
                    offset = 0
                }
            }
    }
}

// Spin animation
struct SpinAnimation: ViewModifier {
    @State private var rotation: Double = 0
    
    func body(content: Content) -> some View {
        content
            .rotationEffect(.degrees(rotation))
            .onAppear {
                withAnimation(
                    Animation.linear(duration: 1.0)
                        .repeatForever(autoreverses: false)
                ) {
                    rotation = 360
                }
            }
    }
}
```

---

## 12. Responsive Breakpoints

```swift
enum Breakpoint {
    case mobile      // < 768px
    case tablet      // 768px - 1024px
    case desktop     // > 1024px
    
    static func current(width: CGFloat) -> Breakpoint {
        if width < 768 {
            return .mobile
        } else if width < 1024 {
            return .tablet
        } else {
            return .desktop
        }
    }
}

// Usage in SwiftUI
struct ResponsiveView: View {
    @Environment(\.horizontalSizeClass) var sizeClass
    
    var body: some View {
        if sizeClass == .compact {
            // Mobile layout
        } else {
            // Desktop layout
        }
    }
}
```

---

## 13. Component Patterns

### Navbar Style
```swift
struct NavbarStyle {
    // Desktop
    let desktopBackground = Color.white.opacity(0.02)
    let desktopBlur: Double = 20
    let desktopSaturation: Double = 150
    let desktopBorder = Color.white.opacity(0.06)
    let desktopCornerRadius: Double = 60
    let desktopPadding = EdgeInsets(top: 4, leading: 24, bottom: 4, trailing: 24)
    let desktopHeight: Double = 54
    
    // Mobile
    let mobileBackground = Color.white.opacity(0.02)
    let mobileCornerRadius: Double = 20
    let mobilePadding = EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16)
    let mobileHeight: Double = 52
}
```

### Dropdown Menu
```swift
struct DropdownStyle {
    let background = Color(hex: "#0a0f1a").opacity(0.85)
    let blur: Double = 40
    let saturation: Double = 180
    let border = Color.white.opacity(0.1)
    let cornerRadius: Double = 16
    let padding: EdgeInsets = EdgeInsets(top: 12, leading: 12, bottom: 12, trailing: 12)
    let minWidth: Double = 200
    let shadow = ShadowStyles.dropdown
}
```

### Footer Style
```swift
struct FooterStyle {
    let background = Color.black.opacity(0.3)
    let borderTop = Color.white.opacity(0.1)
    let padding = EdgeInsets(top: 48, leading: 24, bottom: 24, trailing: 24)
    let marginTop: Double = 80
    let blur: Double = 10
}
```

---

## 14. Z-Index Layers

```swift
enum ZIndex {
    static let background: Double = 0
    static let orbs: Double = 0
    static let gradientLines: Double = 0
    static let content: Double = 1
    static let hero: Double = 2
    static let navbar: Double = 1000
    static let dropdown: Double = 1001
    static let modal: Double = 2000
}
```

---

## 15. Helper Extensions

### Color Extension
```swift
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
```

### View Modifiers
```swift
extension View {
    func glassEffect(intensity: GlassSurface.GlassIntensity = .light) -> some View {
        self.modifier(GlassSurface(intensity: intensity))
    }
    
    func cardStyle() -> some View {
        self
            .background(Color.white.opacity(0.05))
            .background(.ultraThinMaterial)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
            .cornerRadius(20)
            .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
    }
}
```

---

## 16. SwiftUI Implementation Examples

### Glass Card Component
```swift
struct GlassCard<Content: View>: View {
    let content: Content
    
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    var body: some View {
        content
            .padding(24)
            .background(
                ZStack {
                    Color.white.opacity(0.05)
                        .background(.ultraThinMaterial)
                    
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                }
            )
            .cornerRadius(20)
            .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
    }
}
```

### Primary Button Component
```swift
struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
        }
        .buttonStyle(PrimaryButtonStyle())
    }
}
```

### Hero Section
```swift
struct HeroSection: View {
    var body: some View {
        VStack(spacing: 24) {
            Text("The Betting Insider")
                .font(.system(size: 64, weight: .black))
                .foregroundColor(.white)
                .lineLimit(nil)
            
            Text("Your ultimate betting companion")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(textSecondary)
        }
        .padding(.horizontal, 32)
        .padding(.vertical, 128)
    }
}
```

---

## 17. Design Tokens Summary

### Colors
- Primary Blue: `#3b82f6`
- Primary Blue Light: `#60a5fa`
- Success Green: `#10b981`
- Warning Orange: `#f59e0b`
- Error Red: `#ef4444`
- Purple: `#8b5cf6`
- Dark 1: `#0f172a`
- Dark 2: `#1e293b`
- Dark 3: `#334155`

### Spacing Scale
- Base unit: 4px (0.25rem)
- Common: 8, 16, 24, 32, 48, 64, 80, 96, 128

### Border Radius
- Small: 8px
- Medium: 12px
- Large: 16px
- XL: 20px
- XXL: 24px
- Pill: 60px

### Typography Scale
- XS: 10px
- SM: 12px
- Base: 14px
- MD: 15px
- LG: 16px
- XL: 18px
- 2XL: 20px
- 3XL: 24px
- 4XL: 32px
- 5XL: 40px
- 6XL: 48px
- 7XL: 56px
- 8XL: 64px
- 9XL: 72px
- 10XL: 96px

### Glass Effect Properties
- Background opacity: 0.05 (light), 0.08 (medium)
- Blur radius: 20-30px
- Saturation: 150-180%
- Border: 0.5px solid white @ 0.08 opacity
- Shadow: black @ 0.37 opacity, 16px radius

---

## Notes for Swift Implementation

1. **Material Effects**: Use `.ultraThinMaterial` or `.thinMaterial` for glass effects in SwiftUI
2. **Blur**: Use `.blur(radius:)` modifier
3. **Gradients**: Use `LinearGradient` and `RadialGradient`
4. **Shadows**: Use `.shadow()` modifier with color, radius, x, y parameters
5. **Animations**: Use `withAnimation()` and `Animation` types
6. **Responsive**: Use `GeometryReader` and `@Environment(\.horizontalSizeClass)`
7. **Color Opacity**: Use `.opacity()` modifier or `Color.white.opacity(0.5)`

---

This style guide provides all the design tokens, patterns, and examples needed to recreate the visual design in Swift/SwiftUI.


