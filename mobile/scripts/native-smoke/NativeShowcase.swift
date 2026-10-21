import XCTest

final class NativeShowcase: XCTestCase {
  let app = XCUIApplication(bundleIdentifier: "dev.vantage.spectator")
  func pause(_ seconds: Double) { usleep(useconds_t(seconds * 1_000_000)) }
  func shot(_ name: String) {
    let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
    image.name = name; image.lifetime = .keepAlways; add(image)
  }
  func marker(_ name: String) {
    let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    try! Data(String(Date().timeIntervalSince1970).utf8).write(to: folder.appendingPathComponent("vantage_capture_" + name))
  }
  func button(_ prefix: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", prefix)).firstMatch
  }
  override func setUpWithError() throws {
    continueAfterFailure = false
    app.launch()
    let spring = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    if spring.alerts.buttons["Open"].exists { spring.alerts.buttons["Open"].tap() }
    if app.alerts.buttons["Open"].exists { app.alerts.buttons["Open"].tap() }
    app.tabBars.buttons["Race"].tap()
    XCTAssertTrue(app.buttons["All cars"].waitForExistence(timeout: 10))
    XCTAssertTrue(app.staticTexts["Loading native circuit…"].waitForNonExistence(timeout: 30))
    XCTAssertFalse(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Native 3D unavailable")).firstMatch.exists)
    if app.buttons["Pause replay"].exists { app.buttons["Pause replay"].tap() }
    app.buttons["All cars"].tap()
  }
  func testGallery() {
    app.buttons["Play replay"].tap(); pause(4)
    app.buttons["Pause replay"].tap(); shot("01-overview")
    app.buttons["Follow"].tap(); pause(1); shot("02-follow")
    app.buttons["Battle"].tap(); pause(1); shot("03-battle")
    app.tabBars.buttons["Timing"].tap(); pause(0.5); shot("04-timing")
    app.tabBars.buttons["Lab"].tap(); pause(0.5); shot("05-lab")
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.82))
      .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.28)))
    pause(0.5); shot("06-telemetry")
    app.tabBars.buttons["Race"].tap()
    XCTAssertTrue(app.staticTexts["Loading native circuit…"].waitForNonExistence(timeout: 20))
    app.buttons["All cars"].tap(); pause(0.5); shot("07-return")
  }
  // One uncut demonstration: preserve every real tap, camera move, sheet and scroll.
  func testHandsOnVideo() {
    marker("start")
    pause(0.4)
    app.buttons["Play replay"].tap()
    marker("overview"); pause(2.4)
    marker("follow_action")
    app.buttons["Follow"].tap()
    marker("follow"); pause(2.5)
    marker("battle_action")
    app.buttons["Battle"].tap()
    marker("battle"); pause(2.5)
    marker("timing_action")
    app.tabBars.buttons["Timing"].tap()
    marker("timing"); pause(2.0)
    app.buttons["Interval"].tap(); pause(1.8)
    marker("lab_action")
    app.tabBars.buttons["Lab"].tap()
    marker("lab"); pause(2.3)
    marker("comparison_action")
    button("Comparison driver").tap()
    marker("comparison"); pause(1.8)
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Carlos SAINZ,")).firstMatch.tap()
    marker("compared"); pause(1.8)
    marker("scroll_action")
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.81))
      .press(forDuration: 0.15, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.30)), withVelocity: .slow, thenHoldForDuration: 0.1)
    marker("telemetry"); pause(2.4)
    marker("return_action")
    app.tabBars.buttons["Race"].tap()
    app.buttons["All cars"].tap()
    marker("closing"); pause(3.2)
    marker("end")
  }
}
