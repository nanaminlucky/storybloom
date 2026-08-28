# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify
from openai import OpenAI, OpenAIError
from uuid import uuid4
import json
import os
import re

app = Flask(__name__, static_folder='.', static_url_path='')

LAYOUT_CHOICES = ["center", "left-image", "right-image", "bottom"]
STORY_STORE = {}
BAD_WORDS = ["かいらく", "かいらくな", "かいらくの"]
WEIRD_WORD_REPLACEMENTS = {
    "つきのはら": "月の広場",
    "はらのはながき": "花の場所",
    "ほら": "穴",
    "ほらに": "穴に",
    "ちいさなつきのちょう": "小さな月の虫",
    "ひかるはなが": "光る花が",
    "ひかるはな": "光る花",
    "つきの道": "月の道",
}


def sanitize_story_text(value):
    if not isinstance(value, str):
        return value

    cleaned = value
    for bad_word in BAD_WORDS:
        cleaned = cleaned.replace(bad_word, "")
    for weird_word, replacement in WEIRD_WORD_REPLACEMENTS.items():
        cleaned = cleaned.replace(weird_word, replacement)

    cleaned = re.sub(r"のはら(?=[でにへをが、。！？\s])", "の広場", cleaned)
    cleaned = re.sub(r"はら(?=[でにへをがの、。！？\s])", "場所", cleaned)
    cleaned = re.sub(r"\bはら\b", "場所", cleaned)

    cleaned = re.sub(r"[\t\n\r ]+", " ", cleaned)
    cleaned = re.sub(r"\s+([、。！？])", r"\1", cleaned)
    cleaned = re.sub(r"([、。！？]){2,}", r"\1", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    return cleaned.strip()


def sanitize_story(story):
    if not isinstance(story, dict):
        return story

    if "title" in story and isinstance(story["title"], str):
        story["title"] = sanitize_story_text(story["title"])

    for page in story.get("pages", []):
        if not isinstance(page, dict):
            continue
        if "text" in page and isinstance(page["text"], str):
            page["text"] = sanitize_story_text(page["text"])
        if "imagePrompt" in page and isinstance(page["imagePrompt"], str):
            page["imagePrompt"] = sanitize_story_text(page["imagePrompt"])

    return story


def normalize_text_list(value):
    if value is None:
        return []

    if isinstance(value, str):
        parts = [part.strip() for part in re.split(r"[、，,|/]+", value) if part.strip()]
        return parts if parts else []

    if isinstance(value, (list, tuple, set)):
        normalized = []
        for item in value:
            normalized.extend(normalize_text_list(item))
        return normalized

    text = str(value).strip()
    return [text] if text else []


def detect_story_format(payload):
    style_values = []
    for item in normalize_text_list(payload.get("styleList", [])):
        style_values.append(item)
    style_values.extend(normalize_text_list(payload.get("styleIdea", "")))
    text = " ".join(style_values).lower()

    if "詩" in text or "poem" in text or "詩的" in text:
        return "poem"
    if "小説" in text or "novel" in text or "日記" in text or "書簡" in text or "記事" in text or "心の声" in text or "入れ子" in text or "ナンセンス" in text:
        return "novel"
    return "storybook"


def should_generate_images(story):
    return str(story.get("format", "storybook")).lower() == "storybook"


def load_openai_key_from_dotenv(env_path=None):
    candidates = []
    if env_path:
        candidates.append(env_path)
    candidates.extend([
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(__file__), ".env.example"),
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.getcwd(), ".env.example"),
        ".env",
        ".env.example"
    ])

    for candidate in candidates:
        if not candidate:
            continue
        try:
            if not os.path.exists(candidate):
                continue
            with open(candidate, "r", encoding="utf-8") as file:
                for line in file:
                    stripped = line.strip()
                    if not stripped or stripped.startswith("#") or "=" not in stripped:
                        continue
                    key, value = stripped.split("=", 1)
                    key = key.strip()
                    value = value.strip().strip('"\'')
                    if key == "OPENAI_API_KEY" and not os.environ.get("OPENAI_API_KEY"):
                        os.environ["OPENAI_API_KEY"] = value
                        return value
                    if key == "OPENAI_API_KEY":
                        return value
        except OSError:
            continue

    return os.environ.get("OPENAI_API_KEY")


def get_openai_client():
    api_key = load_openai_key_from_dotenv()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEYが設定されていません。.env か環境変数を確認してください。")
    os.environ["OPENAI_API_KEY"] = api_key
    return OpenAI(api_key=api_key)


def build_consistent_character_profile(payload):
    profile_parts = []
    characters = normalize_text_list(payload.get("characters") or [])
    profile_parts.extend(characters)
    character_idea = str(payload.get("characterIdea", "")).strip()
    if character_idea:
        profile_parts.append(character_idea)
    custom_idea = str(payload.get("customIdea", "")).strip()
    if custom_idea:
        profile_parts.append(custom_idea)

    if not profile_parts:
        return "主人公の見た目は一貫して描き、ページごとに違う猫や人物にならないようにしてください。"

    description = "、".join(profile_parts)
    return (
        "主人公と登場人物の見た目は、各ページで同じ見た目・同じ猫の種類・同じ毛色・同じ目の色・同じ耳やしっぽの形を保ち、"
        f"ページごとに別の猫にならないようにしてください。人物設定: {description}."
    )


def build_logline_prompt(payload):
    character_values = normalize_text_list(payload.get("characters") or [])
    world_values = normalize_text_list(payload.get("worlds") or [])
    goal = str(payload.get("storyGoal", "") or "").strip()
    obstacle = str(payload.get("storyObstacle", "") or "").strip()
    turning_point = str(payload.get("storyTurn", "") or "").strip()
    ending = str(payload.get("storyEnding", "") or "").strip()
    custom_idea = str(payload.get("customIdea", "") or "").strip()
    world_idea = str(payload.get("worldIdea", "") or "").strip()
    character_idea = str(payload.get("characterIdea", "") or "").strip()

    parts = [
        "以下の情報をもとに、誰が・何をしたい・何に阻まれる・どう乗り越える・最後はどうなるのかが一目でわかる、具体的で自然なログラインを1つだけ作ってください。",
        "曖昧な表現や抽象的な言い回しは避け、登場人物、場所、動機、障害、転機、結末が具体的に伝わる文章にしてください。",
        "日本語はやさしく、読んだ人がすぐ物語の見通しを持てるようにしてください。",
        "1文〜2文程度で、要点が重ならず、最後にどうなるかが明確に伝わるようにしてください。",
        "必要なら、人名や場所、行動の順番が自然になるように具体化してください。"
    ]

    if character_values:
        parts.append("主人公: " + "、".join(character_values))
    if character_idea:
        parts.append("主人公の特徴: " + character_idea)
    if world_values:
        parts.append("舞台: " + "、".join(world_values))
    if world_idea:
        parts.append("舞台の雰囲気: " + world_idea)
    if custom_idea:
        parts.append("追加のアイデア: " + custom_idea)
    if goal:
        parts.append("目標: " + goal)
    if obstacle:
        parts.append("障害: " + obstacle)
    if turning_point:
        parts.append("転機: " + turning_point)
    if ending:
        parts.append("結末: " + ending)

    parts.append("出力は、文章だけを返してください。説明や箇条書きは不要です。")
    return "\n".join(parts)


def generate_logline_from_payload(payload):
    prompt = build_logline_prompt(payload)
    request_body = {
        "model": "gpt-5-mini",
        "input": [
            {
                "role": "system",
                "content": "あなたは、子ども向けの絵本風物語のログラインを作るプロです。主人公・舞台・目的・障害・転機・結末を具体的に含め、自然で明快な日本語で1つの文章を返してください。"
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    }
    client = get_openai_client()
    response = client.responses.create(**request_body, timeout=60)
    story_text = getattr(response, "output_text", None)
    if story_text is None and hasattr(response, "output"):
        story_text = str(response.output)
    if story_text is None:
        raise RuntimeError("ログラインの生成結果を取得できませんでした。")
    return story_text.strip()


def build_prompt(payload):
    story_format = detect_story_format(payload)
    lines = [
        "以下の情報をもとに、人物の行動と理由が明確で、起こる出来事に因果関係がある物語を作ってください。",
        "読み手が「なぜそうなったのか」を自然に理解できるようにし、導入・展開・転機・解決の流れを明確にしてください。",
        "必ず起承転結を意識し、起で状況を導入し、承で動機や心の揺れを描き、転で大きな変化や決断、結でその結果と余韻を閉じてください。",
        "一つの出来事が、前の出来事の原因や結果として自然に繋がるようにし、いきなり奇跡や変化が起きないようにしてください。",
        "人物の感情や行動には理由があり、何がきっかけでどう変わったのかが読み取れるように書いてください。",
        "読者が知らない前提知識や世界観の説明を、いきなり出さないでください。各場面で必要な情報はその場で自然に説明し、ひとつひとつ順に理解できるようにしてください。",
        "丁寧で具体的な描写を使い、ただの情景の並びではなく、人物が何を悩み、どう決断し、どんな変化が起きるかを含めてください。",
        "各ページまたは各段落の本文は、意味の通る文章で、物語としてつながっていることが大切です。",
        "前の出来事が次の出来事の理由になるようにし、理由がある行動だけを選び、説明が足りない飛躍や不自然な因果関係は避けてください。",
        "絵本は老若男女、特に子どもにもわかるやさしい日本語を使い、言葉が難しくなりすぎないようにしてください。",
        "絵本の本文は、自然で読みやすい日本語にしてください。ひらがなが多くなることがあっても、漢字を無理に消したり、ひらがなだけでごちゃごちゃにしないでください。日常でよく使う簡単な漢字を使い、意味がわかりやすい文章にしてください。",
        "1文は短く、難しい漢字や抽象的な比喩は避けて、言葉の意味がすぐわかる日本語にしてください。特に音読みと訓読みが混ざりやすい表現は避け、自然で普通の言葉を使ってください。",
        "意味のわかりにくい設定や、読者が知らない前提知識は入れず、場面ごとに必要な情報を自然に伝えてください。",
        "表現は、たとえば『銀の石で光の道を作る』のような難解な比喩や不自然な幻想表現を避け、日常で想像しやすい言葉にしてください。",
        "イラストと本文が同じ内容になるようにし、本文の登場人物・場所・感情と、imagePrompt が一致するようにしてください。",
        "イラストに文字、ロゴ、看板、タイトル、言葉、サインは絶対に入れないでください。文字の入った絵は作らないでください。",
        "余計な説明やコードブロックは入れず、純粋なJSONのみを返してください。",
        "JSON形式の例は次の通りです。",
        "{\"title\": \"タイトル\", \"format\": \"storybook\", \"pages\": [{\"text\": \"本文\", \"layout\": \"center\", \"imagePrompt\": \"イラストの説明\"}]}。",
        "layoutの値は次のいずれかにしてください: center, left-image, right-image, bottom。",
        "表現は不自然な形容や指示そのままの言い回しを避け、自然で説得力のある日本語で書いてください。",
        "意味のない造語や不自然な単語は使わないでください。『かいらく』のような説明のない言葉や、意味がわからない言葉は使わないでください。",
        "表現は、読んだ人がすぐ意味を理解できる一般的な日本語だけを使ってください。『のはら』『はらに』『はらの』のような、意味が曖昧な言い回しは絶対に使わないでください。『月の広場』『穴』『花の場所』のような普通の言葉を使って自然な文章にしてください。",
        "文は一文一文が自然で、誰でも意味が伝わることを最優先にし、ややこしい比喩や特殊な言葉を減らしてください。",
    ]

    logline = str(payload.get("storyLogline", "") or "").strip()
    if logline:
        lines.append("ログライン: " + logline)

    goal = str(payload.get("storyGoal", "") or "").strip()
    if goal:
        lines.append("目標: " + goal)

    obstacle = str(payload.get("storyObstacle", "") or "").strip()
    if obstacle:
        lines.append("障害: " + obstacle)

    turning_point = str(payload.get("storyTurn", "") or "").strip()
    if turning_point:
        lines.append("転機: " + turning_point)

    ending = str(payload.get("storyEnding", "") or "").strip()
    if ending:
        lines.append("結末: " + ending)

    plot_summary = " ".join(part for part in [goal, obstacle, turning_point, ending] if part)
    if plot_summary:
        lines.append("物語の骨格: 主人公は目標を持ち、障害にぶつかり、転機で決断し、結末でしっかり解決や余韻を迎えるようにしてください。")

    if story_format == "poem":
        lines.extend([
            "形式は詩にしてください。4つの節で構成し、各節は自然なリズムがあり、情景と感情がつながるようにしてください。",
            "一文一文が鮮明で、情景や気持ちが具体的に伝わるように書いてください。",
            "最後の節で余韻を残し、静かな結びを作ってください。",
            "詩の言葉は「ほんのり不思議な余韻が残りました」などの説明的な言い回しを避け、具体的な情景と感情が立ち上がる表現にしてください。",
        ])
    elif story_format == "novel":
        lines.extend([
            "形式は小説にしてください。4つの段落ほどに分け、登場人物の思考や行動の理由が読み取りやすいように書いてください。",
            "起こる出来事は、前の出来事の結果として自然に起きるものにし、物語の変化が明確にわかるようにしてください。",
            "最後は解決と余韻を含めて、読者が安心して閉じられる結末にしてください。",
            "小説では見出しや説明文を増やさず、文章が自然に読み進められる展開にしてください。",
            "小説の文面は、導入・発展・転機・結末の流れを明確に保ちながら、いきなり現実離れした出来事を起こさないようにしてください。",
            "小説では画像生成をしないでください。imagePromptやimageUrlは出力しないでください。",
            "小説は子どもにもわかるように、やさしい言葉で、意味が明確な短い文にしてください。",
        ])
    else:
        lines.extend([
            "形式は絵本風にしてください。4ページ構成とし、最初の3ページで導入・展開・クライマックスを伝え、4ページ目でやさしくまとめてください。",
            "絵本として読者が情景を想像しやすいように、場面転換と登場人物の動きが明確になるようにしてください。",
            "各ページには、イラスト生成に使える具体的な imagePrompt を必ず含めてください。",
            "imagePrompt は本文の内容から直接作り、イラストと本文が同じ登場人物・場所・感情・動きを表すようにしてください。",
            "絵本の各ページで、主人公の見た目と登場人物の姿は必ず一貫させてください。猫の種類（例: 白猫・シャム猫・茶トラ・黒猫など）・毛色・目の色・耳の形・しっぽの長さがページごとに変わらないようにし、同じキャラクターとして統一してください。",
            "imagePrompt には、同じ主人公の特徴を繰り返し書き込んで、ページごとに別の猫や別の人物にならないようにしてください。",
            "イラストに文字、ロゴ、看板、タイトル、言葉、サインは絶対に入れないでください。文字の入った絵は作らないでください。",
            "子どもから大人まで読みやすい、やさしい言葉で書き、難しい前提知識や説明を出さないでください。",
            "文は短く、自然で読みやすい日本語にし、漢字を無理に消さず、日常で使う簡単な漢字を使ってください。",
            "イラストの中に文章を入れず、文章は本文のテキストにだけ書いてください。",
            "ひとつのページの中で説明的な言葉を増やさず、実際に起こる動きと感情の変化を描いてください。",
            "前の出来事が次の出来事の理由になるようにし、飛躍した説明や理由のない決意は使わないでください。",
        ])

    genre_values = normalize_text_list(payload.get("genres"))
    if genre_values:
        lines.append("ジャンル: " + "、".join(genre_values))
    if payload.get("customIdea"):
        lines.append("特別なアイデア: " + str(payload.get("customIdea", "")).strip())
    if logline:
        lines.append("ログライン: " + logline)
    world_values = normalize_text_list(payload.get("worlds"))
    if world_values:
        lines.append("舞台: " + "、".join(world_values))
    if payload.get("worldIdea"):
        lines.append("舞台のイメージ: " + str(payload.get("worldIdea", "")).strip())
    character_values = normalize_text_list(payload.get("characters"))
    if character_values:
        lines.append("主人公／登場人物: " + "、".join(character_values))
    if payload.get("characterIdea"):
        lines.append("キャラクターの特徴: " + str(payload.get("characterIdea", "")).strip())
    element_values = normalize_text_list(payload.get("elements"))
    if element_values:
        lines.append("起こる出来事: " + "、".join(element_values))
    if payload.get("elementIdea"):
        lines.append("出来事のイメージ: " + str(payload.get("elementIdea", "")).strip())
    mood_values = normalize_text_list(payload.get("moods"))
    if mood_values:
        lines.append("気持ち: " + "、".join(mood_values))
    if payload.get("moodIdea"):
        lines.append("気分の補足: " + str(payload.get("moodIdea", "")).strip())
    style_values = normalize_text_list(payload.get("styleList"))
    if style_values:
        lines.append("文体: " + "、".join(style_values))
    if payload.get("styleIdea"):
        lines.append("文体の補足: " + str(payload.get("styleIdea", "")).strip())

    lines.append(build_consistent_character_profile(payload))

    lines.extend([
        "出力の文章は、場面や感情の変化に理由があり、事実と感情が一貫していることが大切です。",
        "各ページまたは各段落には、前の場面から自然に続く出来事が入っていることを守ってください。",
        "必要な情報はその場で説明し、読者が知らない前提知識をいきなり置かないでください。",
        "絵本の文はやさしく、理解しやすい簡単な日本語を使ってください。",
        "絵文字は使わず、画像用の説明だけを書いてください。",
        "出力のJSONはコメントも余分な説明も含めず、厳密に1つだけ返してください。",
    ])

    return "\n".join(lines)


def parse_story_json(raw_text):
    raw_text = raw_text.strip()
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        start = raw_text.find("{")
        end = raw_text.rfind("}")
        if start != -1 and end != -1:
            return json.loads(raw_text[start:end + 1])
        raise


def validate_story(story):
    if not isinstance(story, dict):
        raise ValueError("story must be a JSON object")
    if "title" not in story or not isinstance(story["title"], str):
        raise ValueError("story.title is required and must be a string")
    if "format" not in story:
        story["format"] = "storybook"
    if not isinstance(story.get("format"), str):
        raise ValueError("story.format must be a string")
    pages = story.get("pages")
    if not isinstance(pages, list) or len(pages) == 0:
        raise ValueError("story.pages must be a non-empty array")
    for page in pages:
        if not isinstance(page, dict):
            raise ValueError("each page must be an object")
        if "text" not in page or not isinstance(page["text"], str):
            raise ValueError("each page must contain a text string")
        if "layout" not in page or page["layout"] not in LAYOUT_CHOICES:
            if story.get("format") in ("poem", "novel"):
                page["layout"] = "center"
            else:
                raise ValueError(f"page.layout must be one of {LAYOUT_CHOICES}")
        if "imagePrompt" not in page or not isinstance(page["imagePrompt"], str):
            page["imagePrompt"] = page.get("text", "")
        if story.get("format") != "storybook":
            page["imagePrompt"] = ""
            page.pop("imageUrl", None)
    return story


def get_image_url_from_response(response, output_format=None):
    image_data = getattr(response, "data", None)
    if not image_data:
        return None
    first = image_data[0]
    if hasattr(first, "url"):
        url = first.url
        if url:
            return url
    if hasattr(first, "b64_json"):
        b64 = first.b64_json
        if b64 and output_format:
            return f"data:image/{output_format};base64,{b64}"
    if isinstance(first, dict):
        if "url" in first and first.get("url"):
            return first.get("url")
        if "b64_json" in first and output_format:
            b64 = first.get("b64_json")
            if b64:
                return f"data:image/{output_format};base64,{b64}"
    return None


def generate_image_url(prompt, size="1024x1024"):
    client = get_openai_client()
    print("[generate_image_url] prompt=", prompt)
    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size=size,
        n=1,
        output_format="png",
        timeout=60
    )
    print("[generate_image_url] response received")
    image_data = getattr(response, "data", None)
    print("[generate_image_url] data type=", type(image_data), "len=", len(image_data) if image_data is not None else None)
    if image_data:
        first = image_data[0]
        print("[generate_image_url] first type=", type(first))
        print("[generate_image_url] first has url=", hasattr(first, "url"), "has b64_json=", hasattr(first, "b64_json"))
    image_url = get_image_url_from_response(response, output_format="png")
    print("[generate_image_url] image_url=", bool(image_url))
    if not image_url:
        debug = {
            "response_repr": repr(response),
            "data_repr": repr(getattr(response, "data", None)),
            "model": "gpt-image-1",
            "prompt": prompt,
            "output_format": "png"
        }
        with open('/tmp/story_image_debug.json', 'w', encoding='utf-8') as f:
            json.dump(debug, f, ensure_ascii=False, indent=2)
        raise RuntimeError("画像生成APIの応答にURLが含まれていません。")
    return image_url


@app.route('/generate-logline', methods=['POST'])
def generate_logline():
    payload = request.get_json(force=True) or {}
    try:
        logline = generate_logline_from_payload(payload)
        return jsonify({"logline": logline})
    except (RuntimeError, OpenAIError) as e:
        return jsonify({"error": "ログラインの生成に失敗しました。", "detail": str(e)}), 500
    except Exception as e:
        return jsonify({"error": "ログライン生成中に予期せぬエラーが発生しました。", "detail": str(e)}), 500


@app.route('/generate-story', methods=['POST'])
def generate_story():
    payload = request.get_json(force=True)
    prompt = build_prompt(payload)
    story_format = detect_story_format(payload)

    request_body = {
        "model": "gpt-5-mini",
        "input": [
            {
                "role": "system",
                "content": "あなたは、因果関係の明確な物語を作るAIです。導入・展開・転機・結末の起承転結を明確にし、前の出来事が次の出来事の理由になるように構成してください。いきなり奇跡や説明不足の展開を使わず、何がきっかけで、誰がどう決め、なぜその結果になったのかが自然に伝わる物語を作ってください。絵本では本文を自然で読みやすい日本語にしてください。漢字を無理に消したり、ひらがなだけでごちゃごちゃにしないでください。日常で使う簡単な漢字を使い、意味がわかりやすい短い文にしてください。説明的な言葉や飛躍した理由は使わず、行動と理由がつながる自然な文章にしてください。さらに本文と imagePrompt は同じ登場人物・場所・感情・動きを表し、イラストと物語が一致するようにしてください。イラストに文字、ロゴ、看板、タイトル、言葉、サインは絶対に入れないでください。文字の入った絵は作らないでください。出力は余計な説明や箇条書きなしの純粋なJSONだけとし、コメントやコードブロックは禁止です。絵本なら各ページに `text`, `layout`, `imagePrompt` を含め、小説や詩なら内容が自然に読めるようにページごとの文章を整えてください。"
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    }

    try:
        client = get_openai_client()
        print("[generate_story] calling OpenAI responses.create")
        response = client.responses.create(**request_body, timeout=60)
        print("[generate_story] responses.create completed")
    except (RuntimeError, OpenAIError) as e:
        print("[generate_story] OpenAI call failed:", type(e).__name__, str(e))
        return jsonify({"error": "AI呼び出しに失敗しました。", "detail": str(e)}), 500
    except Exception as e:
        debug = {
            "request_body": request_body,
            "exception_type": type(e).__name__,
            "exception_str": str(e)
        }
        try:
            resp = getattr(e, 'response', None)
            if resp is not None:
                debug['exception_response'] = getattr(resp, 'text', str(resp))
        except Exception:
            pass
        with open('/tmp/story_generator_debug.json', 'w', encoding='utf-8') as f:
            json.dump(debug, f, ensure_ascii=False, indent=2)
        return jsonify({"error": "サーバーエラーが発生しました。詳細はログを確認してください。"}), 500

    story_text = getattr(response, "output_text", None)
    if story_text is None and hasattr(response, "output"):
        story_text = str(response.output)

    if story_text is None:
        return jsonify({"error": "AIの応答を取得できませんでした。"}), 500

    try:
        story = parse_story_json(story_text)
        if "format" not in story:
            story["format"] = story_format
        story = validate_story(story)
        story = sanitize_story(story)
    except Exception as error:
        return jsonify({"error": "AIの出力がJSONとして正しく解析できませんでした。", "detail": str(error), "raw": story_text}), 500

    if should_generate_images(story) and payload.get("generateImages", True):
        character_profile = build_consistent_character_profile(payload)
        for page in story.get("pages", []):
            image_prompt = page.get("imagePrompt") or page.get("text")
            if image_prompt:
                page_prompt = (
                    "絵本のイラストとして適したやさしい日本語で描写してください。"
                    f"{character_profile} {image_prompt}"
                )
                try:
                    image_url = generate_image_url(page_prompt)
                    page["imageUrl"] = image_url
                except (RuntimeError, OpenAIError) as e:
                    return jsonify({"error": "画像生成に失敗しました。", "detail": str(e)}), 500
                except Exception as e:
                    return jsonify({"error": "画像生成中に予期せぬエラーが発生しました。", "detail": str(e)}), 500
    else:
        for page in story.get("pages", []):
            page.pop("imageUrl", None)
            page.pop("imagePrompt", None)
            if story.get("format") != "storybook":
                page.pop("imagePrompt", None)

    story_id = str(uuid4())
    STORY_STORE[story_id] = story
    return jsonify({"story": story, "storyId": story_id})


@app.route('/generated-story')
def get_generated_story():
    story_id = request.args.get('id')
    if not story_id or story_id not in STORY_STORE:
        return jsonify({"error": "story not found"}), 404
    return jsonify({"story": STORY_STORE[story_id]})


@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def static_file(path):
    return app.send_static_file(path)


@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
