import UIKit
import Social
import UniformTypeIdentifiers

/// iOS Share Extension — share a LinkedIn profile (or any URL/text) into RememberMe.
/// Opens: rememberme://add?linkedin=<url>&text=<optional>
class ShareViewController: UIViewController {

  private let appGroupId = "group.com.rememberme.app"
  private let urlScheme = "rememberme"

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    handleShare()
  }

  private func handleShare() {
    guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
      finish()
      return
    }

    let group = DispatchGroup()
    var foundURL: String?
    var foundText: String?

    for item in items {
      guard let attachments = item.attachments else { continue }
      for provider in attachments {
        if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
          group.enter()
          provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
            defer { group.leave() }
            if let url = item as? URL {
              foundURL = url.absoluteString
            } else if let data = item as? Data, let s = String(data: data, encoding: .utf8) {
              foundURL = s
            }
          }
        }

        if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
          group.enter()
          provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, _ in
            defer { group.leave() }
            if let text = item as? String {
              foundText = text
              if foundURL == nil, let extracted = Self.extractURL(from: text) {
                foundURL = extracted
              }
            }
          }
        }
      }
    }

    group.notify(queue: .main) { [weak self] in
      guard let self else { return }
      self.openApp(url: foundURL, text: foundText)
    }
  }

  private func openApp(url: String?, text: String?) {
    var components = URLComponents()
    components.scheme = urlScheme
    components.host = "add"

    var items: [URLQueryItem] = []
    if let url, !url.isEmpty {
      let isLinkedIn = url.range(of: "linkedin.com", options: .caseInsensitive) != nil
      items.append(URLQueryItem(name: isLinkedIn ? "linkedin" : "url", value: url))
    }
    if let text, !text.isEmpty {
      items.append(URLQueryItem(name: "text", value: text))
    }

    components.queryItems = items.isEmpty ? nil : items

    guard let deepLink = components.url else {
      finish()
      return
    }

    // Persist for cold start race conditions
    if let defaults = UserDefaults(suiteName: appGroupId) {
      defaults.set(deepLink.absoluteString, forKey: "pendingShareURL")
      defaults.synchronize()
    }

    openURL(deepLink)
    // Small delay so the host app can receive the open before we tear down
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
      self?.finish()
    }
  }

  private func finish() {
    extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
  }

  @objc private func openURL(_ url: URL) {
    var responder: UIResponder? = self
    while let r = responder {
      if let application = r as? UIApplication {
        application.open(url, options: [:], completionHandler: nil)
        return
      }
      responder = r.next
    }
    // Fallback for newer extension APIs
    extensionContext?.open(url, completionHandler: nil)
  }

  private static func extractURL(from text: String) -> String? {
    let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
    let range = NSRange(text.startIndex..<text.endIndex, in: text)
    return detector?.firstMatch(in: text, options: [], range: range)?.url?.absoluteString
  }
}
