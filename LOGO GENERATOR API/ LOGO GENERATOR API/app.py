from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

DEVELOPER = "@ab_devs"

@app.route("/")
def home():
    return {
        "message": " 3D Logo Generator API ",
        "developer": DEVELOPER,
        "usage": {
            "/logo": {
                "method": "GET",
                "params": {"prompt": "text (required)"},
                "example": "/logo?prompt=iron man 3d cartoon logo"
            }
        }
    }

@app.route("/logo", methods=["GET"])
def generate_logo():
    prompt = request.args.get("prompt")
    if not prompt:
        return jsonify({"success": False, "message": "Prompt is required", "developer": DEVELOPER})

    try:
        api_url = "https://viscodev.x10.mx/3D_CARTOON/api.php"
        res = requests.post(api_url, json={"prompt": prompt}, timeout=30)

        if res.status_code != 200:
            return jsonify({"success": False, "message": "External API failed", "developer": DEVELOPER})

        data = res.json()

        if not data.get("success"):
            return jsonify({"success": False, "message": data.get("message"), "developer": DEVELOPER})

        images = (
            data.get("images_with_background")
            or data.get("images")
            or data.get("with_background")
            or []
        )

        return jsonify({
            "success": True,
            "prompt": prompt,
            "images": images,
            "developer": DEVELOPER
        })

    except Exception as e:
        return jsonify({"success": False, "message": str(e), "developer": DEVELOPER})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)