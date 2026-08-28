AIを活用したオリジナル物語自動生成アプリ「StoryBloom」の概要、サービスURL（onrender.com）、ファンタジーやSFなどの選べるジャンル、HTML/CSS/JS、Python/Flask、OpenAI API、Renderといった使用技術を記載します。また、開発者向けのローカル環境でのクローン、仮想環境の作成、依存関係のインストール、環境変数設定、アプリ起動の手順を含めます [ユーザーの提供するコード内容に基づく]。
# 📖 StoryBloom

> **わたしだけの、世界に1つのものがたり。**  
> あなたの頭の中にある小さなアイデアを、AIと一緒に「かたち」にしよう。

AIを活用したオリジナルの物語自動生成Webアプリケーションです。

---

## 🔗 サービスURL
ブラウザから誰でもすぐに体験していただけます：  
👉 **[https://storybloom-dzfg.onrender.com](https://storybloom-dzfg.onrender.com)**

---

## 🌈 主な機能と特徴
- **多彩なジャンル選択**: ファンタジー、冒険、ミステリー、SF、恋愛、成長、ホラー、歴史、日常、エッセイなど、お好みのジャンルから物語を展開。
- **自由なアイデア追加**: 選んだジャンルに、ユーザー自身のオリジナルの設定やアイデアをプラスしてストーリーを生成可能。
- **直感的なWebデザイン**: ステップ形式でサクサク進められる快適な操作性を実現。

---

## 🛠 使用技術（Tech Stack）
- **フロントエンド**: HTML5 / CSS3 / JavaScript (Vanilla JS)
- **バックエンド**: Python 3 / Flask
- **AI 統合**: OpenAI API
- **インフラ / デプロイ**: Render (Web Services)
- **環境・パッケージ管理**: Python venv / pip (requirements.txt)
- **バージョン管理**: Git / GitHub

---

## 🚀 開発者向けローカル実行手順

このプロジェクトをご自身のローカル環境で動かすための手順です。

### 1. リポジトリのクローン
ターミナルを開き、プロジェクトをダウンロードします。
```bash
git clone git@github.com:nanaminlucky/storybloom.git
cd storybloom
```

### 2. 仮想環境の作成と有効化
```bash
# 仮想環境を作成
python -m venv venv

# 仮想環境を有効化 (Mac)
source venv/bin/activate
```

### 3. 依存関係（ライブラリ）のインストール
```bash
pip install -r requirements.txt
```

### 4. 環境変数の設定
プロジェクトのルートディレクトリに `.env` ファイルを作成し、ご自身のOpenAI APIキーを設定してください。
```text
OPENAI_API_KEY=your_openai_api_key_here
```
*(※ GitHub上で公開されている `.env.example` ファイルを参考に設定してください)*

### 5. アプリケーションの起動
```bash
python story_generator.py
```
起動後、ブラウザで `http://127.0.0.1:5000` にアクセスするとローカル環境でアプリが動作します。

