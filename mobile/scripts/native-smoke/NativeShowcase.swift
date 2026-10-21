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
    try! Data(Date().description.utf8).write(to: folder.appendingPathComponent("vantage_capture_" + name))
  }
  func button(_ prefix: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", prefix)).firstMatch
  }
  override func setUpWithError() throws {
    continueAfterFailure = false
    app.activate()
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
  func testShortVideo() {
    app.buttons["Play replay"].tap()
    marker("start"); pause(1.4)
    pause(1.6)
    app.buttons["Follow"].tap(); pause(1.4)
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.66, dy: 0.37))
      .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.47, dy: 0.40)))
    app.buttons["Reset camera"].tap()
    app.buttons["Battle"].tap(); pause(1.5)
    button("Playback speed").tap(); app.buttons["2×"].tap(); pause(1.4)
    app.tabBars.buttons["Timing"].tap(); pause(1.2)
    app.buttons["Interval"].tap(); pause(1.0)
    app.buttons["Gap"].tap(); pause(0.8)
    let lec = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Charles LECLERC")).firstMatch
    if lec.isHittable { lec.tap() }
    pause(0.8)
    app.tabBars.buttons["Lab"].tap(); pause(1.2)
    button("Comparison driver").tap(); pause(0.8)
    let nor = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Lando NORRIS,")).firstMatch
    nor.tap(); pause(0.8)
    let chart = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Recorded speed comparison")).firstMatch
    chart.coordinate(withNormalizedOffset: CGVector(dx: 0.62, dy: 0.5)).tap()
    pause(0.5)
    if app.buttons["Play replay"].exists { app.buttons["Play replay"].tap() }
    pause(1.2)
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.82))
      .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.30)))
    pause(1.4)
    app.tabBars.buttons["Race"].tap(); pause(1.2)
    app.buttons["All cars"].tap(); pause(1.0)
    if app.buttons["Play replay"].exists { app.buttons["Play replay"].tap() }
    pause(2.6)
    marker("end")
  }
}
