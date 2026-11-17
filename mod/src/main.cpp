// GENESIS — editor level generation (scaffold)
// ---------------------------------------------------------------
// What this actually does today:
//   * adds a "Generate" button to the level editor
//   * opens a panel with a free-form prompt box and the option row
//   * on Generate, lays down a short, deterministic block/spike pattern
//     in front of the level start, honouring the orbs/pads toggles and
//     the difficulty setting
//
// What is deliberately stubbed (clearly marked TODO below):
//   * camera-relative placement (it starts at a fixed x for now)
//   * prompt parsing — the text is logged and echoed, not interpreted
//   * song BPM detection, version filtering, decoration pass
//
// If CMakeLists.txt from `geode new` is used, this file is the only
// source you need to replace.
// ---------------------------------------------------------------

#include <Geode/Geode.hpp>
#include <Geode/modify/EditorUI.hpp>
#include <Geode/ui/TextInput.hpp>

using namespace geode::prelude;

namespace {

    constexpr float UNIT = 30.f;          // one editor grid unit in pixels

    // object ids (stable, vanilla GD)
    constexpr int OBJ_BLOCK       = 1;
    constexpr int OBJ_SPIKE       = 8;
    constexpr int OBJ_ORB_JUMP    = 36;
    constexpr int OBJ_PAD_JUMP    = 35;

    constexpr int VERSIONS[] = { 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220 };
    constexpr char const* VERSION_NAMES[] = {
        "1.0", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6",
        "1.7", "1.8", "1.9", "2.0", "2.1", "2.2"
    };
    constexpr char const* DIFF_NAMES[] = { "Easy", "Normal", "Hard", "Harder", "Insane", "Extreme" };

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
        if (!CCLayerColor::initWithColor({ 0, 0, 0, 190 })) return false;
        m_ui = ui;

        auto winSize = CCDirector::get()->getWinSize();

        auto bg = cocos2d::extension::CCScale9Sprite::create("GJ_square01.png");
        if (bg) {
            bg->setContentSize({ 400.f, 300.f });
            bg->setPosition({ winSize.width / 2, winSize.height / 2 });
            this->addChild(bg, 0);
        }

        auto title = CCLabelBMFont::create("Generate a level", "bigFont.fnt");
        title->setScale(0.7f);
        title->setPosition({ winSize.width / 2, winSize.height / 2 + 130.f });
        this->addChild(title, 2);

        // ---- prompt ------------------------------------------------------
        m_prompt = TextInput::create(340.f, "type any idea...");
        if (m_prompt) {
            m_prompt->setPosition({ winSize.width / 2, winSize.height / 2 + 85.f });
            m_prompt->setID("genesis-prompt"_spr);
            m_prompt->setString(Mod::get()->getSavedValue<std::string>("last-prompt", ""));
            this->addChild(m_prompt, 2);
        }

        // ---- option row --------------------------------------------------
        auto menu = CCMenu::create();
        menu->setPosition({ 0.f, 0.f });
        menu->setID("genesis-options"_spr);
        this->addChild(menu, 3);

        auto mkButton = [this, menu](char const* caption, CCPoint pos, SEL_MenuHandler sel) {
            auto spr = ButtonSprite::create(caption, "goldFont.fnt", "GJ_button_01.png", 0.6f);
            auto item = CCMenuItemSpriteExtra::create(spr, this, sel);
            item->setPosition(pos);
            menu->addChild(item);
            return item;
        };

        float cx = winSize.width / 2;
        float rowY = winSize.height / 2 + 40.f;

        mkButton("Version", { cx - 150.f, rowY }, menu_selector(GeneratePanel::onCycleVersion));
        m_versionLabel = CCLabelBMFont::create(VERSION_NAMES[m_versionIndex], "bigFont.fnt");
        m_versionLabel->setScale(0.5f);
        m_versionLabel->setPosition({ cx - 90.f, rowY });
        this->addChild(m_versionLabel, 2);

        mkButton("Difficulty", { cx + 30.f, rowY }, menu_selector(GeneratePanel::onCycleDifficulty));
        m_diffLabel = CCLabelBMFont::create(DIFF_NAMES[m_diffIndex], "bigFont.fnt");
        m_diffLabel->setScale(0.5f);
        m_diffLabel->setPosition({ cx + 100.f, rowY });
        this->addChild(m_diffLabel, 2);

        // ---- gadget toggles ---------------------------------------------
        auto mkToggle = [this, menu](CCPoint pos, SEL_MenuHandler sel, bool on) {
            auto tog = CCMenuItemToggler::createWithStandardSprites(this, sel, 0.7f);
            tog->toggle(on);
            tog->setPosition(pos);
            menu->addChild(tog);
            return tog;
        };

        float toggleY = winSize.height / 2 - 5.f;
        m_orbs    = mkToggle({ cx - 150.f, toggleY }, menu_selector(GeneratePanel::onToggleOrbs), true);
        m_pads    = mkToggle({ cx - 40.f,  toggleY }, menu_selector(GeneratePanel::onTogglePads), true);
        m_portals = mkToggle({ cx + 70.f,  toggleY }, menu_selector(GeneratePanel::onTogglePortals), false);

        addToggleLabel("Orbs",    { cx - 130.f, toggleY });
        addToggleLabel("Pads",    { cx - 20.f,  toggleY });
        addToggleLabel("Portals", { cx + 92.f,  toggleY });

        // ---- actions -----------------------------------------------------
        auto genSpr = ButtonSprite::create("Generate", "goldFont.fnt", "GJ_button_02.png", 0.9f);
        auto genBtn = CCMenuItemSpriteExtra::create(genSpr, this, menu_selector(GeneratePanel::onGenerate));
        genBtn->setPosition({ cx - 80.f, winSize.height / 2 - 80.f });
        menu->addChild(genBtn);

        mkButton("Close", { cx + 80.f, winSize.height / 2 - 80.f }, menu_selector(GeneratePanel::onClose));

        this->setKeypadEnabled(true);
        return true;
    }

    void addToggleLabel(char const* text, CCPoint pos) {
        auto lbl = CCLabelBMFont::create(text, "chatFont.fnt");
        lbl->setScale(0.8f);
        lbl->setPosition({ pos.x, pos.y - 28.f });
        this->addChild(lbl, 2);
    }

    void onClose(CCObject*) {
        this->removeFromParentAndCleanup(true);
    }

    void onCycleVersion(CCObject*) {
        m_versionIndex = (m_versionIndex + 1) % (sizeof(VERSIONS) / sizeof(VERSIONS[0]));
        m_versionLabel->setString(VERSION_NAMES[m_versionIndex]);
    }

    void onCycleDifficulty(CCObject*) {
        m_diffIndex = (m_diffIndex + 1) % (sizeof(DIFF_NAMES) / sizeof(DIFF_NAMES[0]));
        m_diffLabel->setString(DIFF_NAMES[m_diffIndex]);
    }

    void onToggleOrbs(CCObject*)    { }
    void onTogglePads(CCObject*)    { }
    void onTogglePortals(CCObject*) { }

    // -----------------------------------------------------------------------
    // The generator. Today: a fixed short pattern, so the smoke test has
    // something deterministic to look at.
    // -----------------------------------------------------------------------
    void onGenerate(CCObject*) {
        auto lel = LevelEditorLayer::get();
        if (!lel) {
            Notification::create("Open a level first", NotificationIcon::Error)->show();
            return;
        }

        std::string prompt = m_prompt ? m_prompt->getString() : "";
        Mod::get()->setSavedValue("last-prompt", prompt);

        bool useOrbs    = m_orbs && m_orbs->isOn();
        bool usePads    = m_pads && m_pads->isOn();
        bool usePortals = m_portals && m_portals->isOn();

        float groundY = Mod::get()->getSavedValue<float>("ground-y", 105.f);
        float startX  = 300.f;                       // TODO: camera-relative
        float spacing = UNIT * (float)(5 + (5 - m_diffIndex));

        int placed = 0;

        for (int i = 0; i < 12; i++) {
            float x = startX + i * spacing;

            lel->createObject(OBJ_BLOCK, { x, groundY }, false);
            placed++;

            if (i % 3 == 2) {
                lel->createObject(OBJ_SPIKE, { x + UNIT, groundY }, false);
                placed++;
            }
            if (useOrbs && i % 4 == 1) {
                lel->createObject(OBJ_ORB_JUMP, { x + UNIT, groundY + UNIT * 3 }, false);
                placed++;
            }
            if (usePads && i % 5 == 3) {
                lel->createObject(OBJ_PAD_JUMP, { x, groundY }, false);
                placed++;
            }
        }

        // portals are accepted as an option but not placed yet
        if (usePortals) {
            log::info("portals requested; portal placement not implemented yet");
        }

        log::info("generated {} objects | version {} | difficulty {} | prompt: \"{}\"",
            placed, VERSION_NAMES[m_versionIndex], DIFF_NAMES[m_diffIndex], prompt);

        Notification::create(
            fmt::format("Placed {} objects ({})", placed, DIFF_NAMES[m_diffIndex]),
            NotificationIcon::Success
        )->show();

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

        auto spr = ButtonSprite::create("Generate", "goldFont.fnt", "GJ_button_01.png", 0.8f);
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
