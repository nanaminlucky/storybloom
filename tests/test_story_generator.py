import unittest

from story_generator import build_logline_prompt, build_prompt, should_generate_images, sanitize_story


class StoryGeneratorPromptTests(unittest.TestCase):
    def test_prompt_requires_clear_plot_structure(self):
        payload = {
            "styleList": ["小説"],
            "characters": ["ひとりの少女"],
            "worlds": ["村"],
            "elements": ["雨", "灯り", "鍵"],
        }

        prompt = build_prompt(payload)

        self.assertIn("起承転結", prompt)
        self.assertIn("因果関係", prompt)
        self.assertIn("なぜそうなったのか", prompt)

    def test_novel_format_does_not_request_images(self):
        self.assertFalse(should_generate_images({"format": "novel"}))
        self.assertTrue(should_generate_images({"format": "storybook"}))

    def test_prompt_requires_consistent_character_visuals_for_storybook(self):
        payload = {
            "styleList": ["絵本"],
            "characters": ["猫"],
            "characterIdea": "主人公は白いシャム猫で、青い目とふわふわしたしっぽを持つ。",
        }

        prompt = build_prompt(payload)

        self.assertIn("同じ見た目", prompt)
        self.assertIn("シャム猫", prompt)
        self.assertIn("猫の種類", prompt)

    def test_prompt_accepts_string_values_as_single_choices(self):
        payload = {
            "genres": "冒険",
            "styleList": "絵本",
            "worlds": "森",
            "characters": "白い猫",
            "customIdea": "月の光を追う",
        }

        prompt = build_prompt(payload)

        self.assertIn("冒険", prompt)
        self.assertIn("絵本", prompt)
        self.assertIn("森", prompt)
        self.assertIn("白い猫", prompt)
        self.assertIn("月の光を追う", prompt)

    def test_prompt_uses_simple_child_friendly_language(self):
        payload = {
            "styleList": ["絵本"],
            "characters": ["小さな猫"],
            "worlds": ["森"],
            "customIdea": "お月さまを追う",
        }

        prompt = build_prompt(payload)

        self.assertIn("子ども", prompt)
        self.assertIn("やさしい日本語", prompt)
        self.assertIn("短く", prompt)
        self.assertIn("前提知識", prompt)

    def test_prompt_includes_story_logline_and_plot_structure(self):
        payload = {
            "styleList": ["絵本"],
            "characters": ["小さな猫"],
            "worlds": ["森"],
            "customIdea": "月の光を追う",
            "storyLogline": "小さな猫が月の光を取り戻すために森の守り人と向き合う",
            "storyGoal": "月の光を取り戻して家に帰る",
            "storyObstacle": "森の守り人が光を守っている",
            "storyTurn": "猫が守り人の本当の理由を知る",
            "storyEnding": "光を分けて家に帰り、安心する",
        }

        prompt = build_prompt(payload)

        self.assertIn("ログライン", prompt)
        self.assertIn("月の光を取り戻すために森の守り人と向き合う", prompt)
        self.assertIn("目標", prompt)
        self.assertIn("月の光を取り戻して家に帰る", prompt)
        self.assertIn("障害", prompt)
        self.assertIn("森の守り人が光を守っている", prompt)
        self.assertIn("転機", prompt)
        self.assertIn("安心する", prompt)

    def test_build_logline_prompt_uses_specific_story_details(self):
        payload = {
            "characters": ["白い猫"],
            "worlds": ["月の森"],
            "storyGoal": "月の光を取り戻す",
            "storyObstacle": "森の守り人に止められる",
            "storyTurn": "ふしぎな友だちに出会う",
            "storyEnding": "月の光を分けて安心して家へ帰る",
        }

        prompt = build_logline_prompt(payload)

        self.assertIn("白い猫", prompt)
        self.assertIn("月の森", prompt)
        self.assertIn("月の光を取り戻す", prompt)
        self.assertIn("森の守り人に止められる", prompt)
        self.assertIn("ふしぎな友だちに出会う", prompt)
        self.assertIn("具体的", prompt)

    def test_prompt_requires_readable_japanese_and_causal_logic(self):
        payload = {
            "styleList": ["絵本"],
            "characters": ["白いねこ"],
            "worlds": ["月の森"],
            "storyGoal": "うさぎをたすける",
            "storyObstacle": "みちがわからない",
            "storyTurn": "しっぽの長さを思い出す",
            "storyEnding": "うさぎをたすけて安心する",
            "customIdea": "うさぎがかぜをひいている",
        }

        prompt = build_prompt(payload)

        self.assertIn("ひらがなが多く", prompt)
        self.assertIn("簡単な漢字", prompt)
        self.assertIn("理由がある", prompt)
        self.assertIn("前の出来事が次の出来事の理由", prompt)
        self.assertIn("イラストと本文が同じ内容", prompt)

    def test_prompt_forbids_text_in_illustrations(self):
        payload = {"styleList": ["絵本"], "characters": ["白いねこ"], "worlds": ["月の森"]}

        prompt = build_prompt(payload)

        self.assertIn("イラストに文字", prompt)
        self.assertIn("入れない", prompt)

    def test_sanitize_story_removes_nonsensical_words(self):
        story = {
            "title": "かいらくのまど",
            "format": "storybook",
            "pages": [
                {"text": "かいらくな森で、白い猫がきれいにほっぺをさわった。", "layout": "center", "imagePrompt": "かいらくな森"}
            ]
        }

        cleaned = sanitize_story(story)

        self.assertNotIn("かいらく", cleaned["title"])
        self.assertNotIn("かいらく", cleaned["pages"][0]["text"])
        self.assertNotIn("かいらく", cleaned["pages"][0]["imagePrompt"])

    def test_sanitize_story_replaces_ambiguous_fantasy_terms_with_common_japanese(self):
        story = {
            "title": "月の広場の物語",
            "format": "storybook",
            "pages": [
                {"text": "つきのはらで、ほらに花がさいていた。", "layout": "center", "imagePrompt": "はらのはながき"}
            ]
        }

        cleaned = sanitize_story(story)

        self.assertNotIn("つきのはら", cleaned["pages"][0]["text"])
        self.assertNotIn("ほら", cleaned["pages"][0]["text"])
        self.assertNotIn("はらのはながき", cleaned["pages"][0]["imagePrompt"])
        self.assertIn("月の広場", cleaned["pages"][0]["text"])
        self.assertIn("穴", cleaned["pages"][0]["text"])

    def test_load_openai_key_from_dotenv_if_env_missing(self):
        import tempfile
        import os

        original = os.environ.get("OPENAI_API_KEY")
        os.environ.pop("OPENAI_API_KEY", None)
        temp_dir = tempfile.TemporaryDirectory()
        env_path = os.path.join(temp_dir.name, ".env")
        with open(env_path, "w", encoding="utf-8") as f:
            f.write("OPENAI_API_KEY=test-key-from-dotenv\n")

        try:
            from story_generator import load_openai_key_from_dotenv
            self.assertEqual(load_openai_key_from_dotenv(env_path), "test-key-from-dotenv")
            self.assertEqual(os.environ.get("OPENAI_API_KEY"), "test-key-from-dotenv")
        finally:
            if original is None:
                os.environ.pop("OPENAI_API_KEY", None)
            else:
                os.environ["OPENAI_API_KEY"] = original
            temp_dir.cleanup()


if __name__ == "__main__":
    unittest.main()
