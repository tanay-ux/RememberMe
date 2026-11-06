import Foundation
import UIKit

/// Call from the main app AppDelegate / scene become-active.
/// Consumes the URL written by RememberMeShare when cold-start races miss appUrlOpen.
enum PendingShareHandoff {
  static let appGroupId = "group.com.rememberme.app"
  static let pendingKey = "pendingShareURL"

  /// Returns and clears any pending share deep link (`rememberme://add?…`).
  static func consumePendingURL() -> URL? {
    guard let defaults = UserDefaults(suiteName: appGroupId),
          let raw = defaults.string(forKey: pendingKey),
          !raw.isEmpty,
          let url = URL(string: raw)
    else {
      return nil
    }
    defaults.removeObject(forKey: pendingKey)
    defaults.synchronize()
    return url
  }

  /// Open the pending share into the main app (triggers Capacitor appUrlOpen).
  static func openIfNeeded() {
    guard let url = consumePendingURL() else { return }
    DispatchQueue.main.async {
      UIApplication.shared.open(url, options: [:], completionHandler: nil)
    }
  }
}
