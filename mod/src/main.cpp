// GENESIS — editor level generation (scaffold, compile-hardened)
// ---------------------------------------------------------------
// Works today:
//   * "Generate" button in the level editor (bottom-right, no duplicates)
//   * panel with a free-form prompt box + version / difficulty / gadget row
//   * Generate lays a deterministic block+spike pattern from the level start,
//     adding orbs/pads when those toggles are on, then notifies + logs
//
// Stubbed (TODO markers below): camera-relative placement, prompt parsing,
// version object-pool filtering, BPM/song sync, portals, decoration pass.
//
// Hardening pass — all of these were the likely first-compile-error sources:
//   * explicit LevelEditorLayer include
//   * no CCScale9Sprite (removed the 9-slice background entirely)
//   * no fmt::format (plain std::string concatenation)
//   * single-argument ButtonSprite::create
//   * cocos2d::ccc4 for the layer colour
//   * int constants for array counts instead of sizeof arithmetic in modulo
// ---------------------------------------------------------------

#include <Geode/Geode.hpp>
#include <Geode/modify/EditorUI.hpp>
#include <Geode/binding/LevelEditorLayer.hpp>
#include <Geode/ui/TextInput.hpp>

using namespace geode::prelude;

namespace {

    constexpr float UNIT = 30.f;              // one editor grid unit in pixels

    constexpr int OBJ_BLOCK    = 1;
    constexpr int OBJ_SPIKE    = 8;
    constexpr int OBJ_PAD_JUMP = 35;
    constexpr int OBJ_ORB_JUMP = 36;

    char const* const VERSION_NAMES[] = {
        "1.0", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6",
        "1.7", "1.8", "1.9", "2.0", "2.1", "2.2"
    };
    int const VERSION_COUNT = 13;

    char const* const DIFF_NAMES[] = {
        "Easy", "Normal", "Hard", "Harder", "Insane", "Extreme"
    };
    int const DIFF_COUNT = 6;

} // namespace

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
class GeneratePanel : public cocos2d::CCLayerColor {
public:
    static GeneratePanel* create(EditorUI* ui) {
        auto ret = new GeneratePanel();
        if (ret && ret->init(ui)) {
            ret->autorelease();
            return ret;
        }
        CC_SAFE_DELETE(ret);
        return nullptr;
    }

protected:
    EditorUI* m_ui = nullptr;
    TextInput* m_prompt = nullptr;
    CCMenuItemToggler* m_orbs = nullptr;
    CCMenuItemToggler* m_pads = nullptr;
    CCMenuItemToggler* m_portals = nullptr;
    CCLabelBMFont* m_versionLabel = nullptr;
    CCLabelBMFont* m_diffLabel = nullptr;
    int m_versionIndex = 12;   // 2.2
    int m_diffIndex = 1;       // Normal

    bool init(EditorUI* ui) {
        if (!CCLayerColor::initWithColor(cocos2d::ccc4(0, 0, 0, 200))) return false;
        m_ui = ui;

        auto winSize = CCDirector::get()->getWinSize();
        float cx = winSize.width / 2;
        float cy = winSize.height / 2;

        auto title = CCLabelBMFont::create("Generate a level", "bigFont.fnt");
        title->setScale(0.7f);
        title->setPosition({ cx, cy + 130.f });
        this->addChild(title, 2);

        auto hint = CCLabelBMFont::create("vague, object-level or specific - any idea works", "chatFont.fnt");
        hint->setScale(0.6f);
        hint->setColor({ 190, 190, 210 });
        hint->setPosition({ cx, cy + 108.f });
        this->addChild(hint, 2);

        // ---- prompt -----------------------------------------------------
        m_prompt = TextInput::create(340.f, "type any idea...");
        if (m_prompt) {
            m_prompt->setPosition({ cx, cy + 82.f });
            m_prompt->setID("genesis-prompt"_spr);
            m_prompt->setString(Mod::get()->getSavedValue<std::string>("last-prompt", std::string("")));
            this->addChild(m_prompt, 2);
        }

        // ---- option row --------------------------------------------------
        auto menu = CCMenu::create();
        menu->setPosition({ 0.f, 0.f });
        menu->setID("genesis-options"_spr);
        this->addChild(menu, 3);

        auto addButton = [this, menu](char const* caption, cocos2d::CCPoint pos,
                                      cocos2d::SEL_MenuHandler sel) -> CCMenuItemSpriteExtra* {
            auto spr = ButtonSprite::create(caption);
            auto item = CCMenuItemSpriteExtra::create(spr, this, sel);
            item->setPosition(pos);
            menu->addChild(item);
            return item;
        };

        float rowY = cy + 38.f;

        addButton("<", { cx - 175.f, rowY }, menu_selector(GeneratePanel::onVersionPrev));
        m_versionLabel = CCLabelBMFont::create(VERSION_NAMES[m_versionIndex], "bigFont.fnt");
        m_versionLabel->setScale(0.55f);
        m_versionLabel->setPosition({ cx - 130.f, rowY });
        this->addChild(m_versionLabel, 2);
        addButton(">", { cx - 85.f, rowY }, menu_selector(GeneratePanel::onVersionNext));

        addButton("<", { cx + 10.f, rowY }, menu_selector(GeneratePanel::onDiffPrev));
        m_diffLabel = CCLabelBMFont::create(DIFF_NAMES[m_diffIndex], "bigFont.fnt");
        m_diffLabel->setScale(0.55f);
        m_diffLabel->setPosition({ cx + 70.f, rowY });
        this->addChild(m_diffLabel, 2);
        addButton(">", { cx + 130.f, rowY }, menu_selector(GeneratePanel::onDiffNext));

        auto verCaption = CCLabelBMFont::create("version", "chatFont.fnt");
        verCaption->setScale(0.55f);
        verCaption->setPosition({ cx - 130.f, rowY - 24.f });
        verCaption->setColor({ 170, 170, 190 });
        this->addChild(verCaption, 2);

        auto difCaption = CCLabelBMFont::create("difficulty", "chatFont.fnt");
        difCaption->setScale(0.55f);
        difCaption->setPosition({ cx + 70.f, rowY - 24.f });
        difCaption->setColor({ 170, 170, 190 });
        this->addChild(difCaption, 2);

        // ---- gadget toggles ---------------------------------------------
        auto addToggle = [this, menu](cocos2d::CCPoint pos, cocos2d::SEL_MenuHandler sel,
                                      bool on) -> CCMenuItemToggler* {
            auto tog = CCMenuItemToggler::createWithStandardSprites(this, sel, 0.7f);
            tog->toggle(on);
            tog->setPosition(pos);
            menu->addChild(tog);
            return tog;
        };

        float toggleY = cy - 8.f;
        m_orbs    = addToggle({ cx - 120.f, toggleY }, menu_selector(GeneratePanel::onToggleOrbs), true);
        m_pads    = addToggle({ cx - 20.f,  toggleY }, menu_selector(GeneratePanel::onTogglePads), true);
        m_portals = addToggle({ cx + 80.f,  toggleY }, menu_selector(GeneratePanel::onTogglePortals), false);

        addToggleLabel("Orbs",    { cx - 100.f, toggleY - 26.f });
        addToggleLabel("Pads",    { cx,          toggleY - 26.f });
        addToggleLabel("Portals", { cx + 100.f,  toggleY - 26.f });

        // ---- actions -----------------------------------------------------
        auto genSpr = ButtonSprite::create("Generate");
        auto genBtn = CCMenuItemSpriteExtra::create(genSpr, this, menu_selector(GeneratePanel::onGenerate));
        genBtn->setPosition({ cx - 80.f, cy - 82.f });
        menu->addChild(genBtn);

        addButton("Close", { cx + 80.f, cy - 82.f }, menu_selector(GeneratePanel::onClose));

        return true;
    }

    void addToggleLabel(char const* text, cocos2d::CCPoint pos) {
        auto lbl = CCLabelBMFont::create(text, "chatFont.fnt");
        lbl->setScale(0.75f);
        lbl->setPosition(pos);
        this->addChild(lbl, 2);
    }

    void onClose(CCObject*) {
        this->removeFromParentAndCleanup(true);
    }

    void onVersionPrev(CCObject*) {
        m_versionIndex = (m_versionIndex + VERSION_COUNT - 1) % VERSION_COUNT;
        m_versionLabel->setString(VERSION_NAMES[m_versionIndex]);
    }
    void onVersionNext(CCObject*) {
        m_versionIndex = (m_versionIndex + 1) % VERSION_COUNT;
        m_versionLabel->setString(VERSION_NAMES[m_versionIndex]);
    }
    void onDiffPrev(CCObject*) {
        m_diffIndex = (m_diffIndex + DIFF_COUNT - 1) % DIFF_COUNT;
        m_diffLabel->setString(DIFF_NAMES[m_diffIndex]);
    }
    void onDiffNext(CCObject*) {
        m_diffIndex = (m_diffIndex + 1) % DIFF_COUNT;
        m_diffLabel->setString(DIFF_NAMES[m_diffIndex]);
    }

    // togglers flip themselves; these only exist because the callback needs a target
    void onToggleOrbs(CCObject*)    { }
    void onTogglePads(CCObject*)    { }
    void onTogglePortals(CCObject*) { }

    // -----------------------------------------------------------------------
    // Generator (stub). Deterministic so the smoke test can be repeated.
    // -----------------------------------------------------------------------
    void onGenerate(CCObject*) {
        auto lel = LevelEditorLayer::get();
        if (!lel) {
            Notification::create("Open a level first", NotificationIcon::Error)->show();
            return;
        }

        std::string prompt = m_prompt ? m_prompt->getString() : std::string("");
        Mod::get()->setSavedValue("last-prompt", prompt);

        bool useOrbs    = m_orbs && m_orbs->isOn();
        bool usePads    = m_pads && m_pads->isOn();
        bool usePortals = m_portals && m_portals->isOn();

        float groundY = Mod::get()->getSavedValue<float>("ground-y", 105.f);
        float startX  = 300.f;                              // TODO: camera-relative
        float spacing = UNIT * float(5 + (DIFF_COUNT - 1 - m_diffIndex));

        int placed = 0;

        for (int i = 0; i < 12; ++i) {
            float x = startX + float(i) * spacing;

            lel->createObject(OBJ_BLOCK, { x, groundY }, false);
            ++placed;

            if (i % 3 == 2) {
                lel->createObject(OBJ_SPIKE, { x + UNIT, groundY }, false);
                ++placed;
            }
            if (useOrbs && i % 4 == 1) {
                lel->createObject(OBJ_ORB_JUMP, { x + UNIT, groundY + UNIT * 3.f }, false);
                ++placed;
            }
            if (usePads && i % 5 == 3) {
                lel->createObject(OBJ_PAD_JUMP, { x, groundY }, false);
                ++placed;
            }
        }

        if (usePortals) {
            log::info("portals requested; portal placement not implemented yet");
        }

        log::info("generated {} objects | version {} | difficulty {} | prompt \"{}\"",
            placed, VERSION_NAMES[m_versionIndex], DIFF_NAMES[m_diffIndex], prompt);

        std::string msg = "Placed " + std::to_string(placed) + " objects (" +
                          DIFF_NAMES[m_diffIndex] + ")";
        Notification::create(msg, NotificationIcon::Success)->show();

        this->removeFromParentAndCleanup(true);
    }
};

// ---------------------------------------------------------------------------
// Editor integration
// ---------------------------------------------------------------------------
class $modify(GenesisEditorUI, EditorUI) {
    bool init(LevelEditorLayer* editorLayer) {
        if (!EditorUI::init(editorLayer)) return false;

        if (this->getChildByID("genesis-menu"_spr)) return true;

        auto winSize = CCDirector::get()->getWinSize();

        auto spr = ButtonSprite::create("Generate");
        auto btn = CCMenuItemSpriteExtra::create(
            spr, this, menu_selector(GenesisEditorUI::onGenerateButton)
        );

        auto menu = CCMenu::create();
        menu->addChild(btn);
        menu->setPosition({ winSize.width - 70.f, 45.f });
        menu->setID("genesis-menu"_spr);
        this->addChild(menu, 100);

        log::info("GENESIS: Generate button added to the editor");
        return true;
    }

    void onGenerateButton(CCObject*) {
        if (auto existing = this->getChildByID("genesis-panel"_spr)) {
            existing->removeFromParentAndCleanup(true);
        }
        if (auto panel = GeneratePanel::create(this)) {
            panel->setID("genesis-panel"_spr);
            this->addChild(panel, 1000);
        }
    }
};
