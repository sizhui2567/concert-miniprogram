import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def print_result(name, ok, detail=""):
    flag = "PASS" if ok else "FAIL"
    print(f"[{flag}] {name} {detail}".rstrip())


def run_node_check(path: Path):
    cmd = ["node", "--check", str(path)]
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    ok = proc.returncode == 0
    detail = "ok" if ok else proc.stderr.strip().splitlines()[-1] if proc.stderr else "syntax error"
    print_result(f"语法检查 {path.relative_to(ROOT)}", ok, detail)
    return ok


def file_contains(path: Path, pattern: str, name: str):
    text = path.read_text(encoding="utf-8")
    ok = pattern in text
    print_result(name, ok, f"pattern={pattern}")
    return ok


def exists(path: Path, name: str):
    ok = path.exists()
    print_result(name, ok, str(path.relative_to(ROOT)))
    return ok


def main():
    js_files = [
      ROOT / "miniprogram/utils/api.js",
      ROOT / "miniprogram/pages/detail/detail.js",
      ROOT / "cloudfunctions/saveSeatView/index.js",
      ROOT / "cloudfunctions/getSeatViews/index.js",
      ROOT / "cloudfunctions/saveBuddyPost/index.js",
      ROOT / "cloudfunctions/getBuddyPosts/index.js",
      ROOT / "cloudfunctions/saveAnnouncementMessage/index.js",
      ROOT / "cloudfunctions/getAnnouncementMessages/index.js",
      ROOT / "cloudfunctions/reportContent/index.js",
      ROOT / "cloudfunctions/blockUser/index.js",
      ROOT / "cloudfunctions/moderateContent/index.js"
    ]

    checks = []
    for js_file in js_files:
        checks.append(run_node_check(js_file))

    checks.append(file_contains(
      ROOT / "miniprogram/utils/api.js",
      "reportContent",
      "API 已暴露 reportContent"
    ))
    checks.append(file_contains(
      ROOT / "miniprogram/utils/api.js",
      "blockUser",
      "API 已暴露 blockUser"
    ))
    checks.append(file_contains(
      ROOT / "miniprogram/utils/api.js",
      "moderateContent",
      "API 已暴露 moderateContent"
    ))
    checks.append(file_contains(
      ROOT / "miniprogram/pages/detail/detail.js",
      "seatViewRatingOptions",
      "详情页已接入座位评分"
    ))
    checks.append(file_contains(
      ROOT / "miniprogram/pages/detail/detail.js",
      "onReportContent",
      "详情页已接入举报"
    ))
    checks.append(file_contains(
      ROOT / "miniprogram/pages/detail/detail.js",
      "onAdminModerateAnnouncement",
      "详情页已接入公告管理动作"
    ))
    checks.append(file_contains(
      ROOT / "miniprogram/pages/detail/detail.wxml",
      "announcement-pinned",
      "详情页公告已接入置顶展示"
    ))
    checks.append(file_contains(
      ROOT / "miniprogram/pages/detail/detail.wxml",
      "bindtap=\"onBlockUser\"",
      "详情页已接入拉黑按钮"
    ))

    for fn in ["reportContent", "blockUser", "moderateContent"]:
      checks.append(exists(ROOT / f"cloudfunctions/{fn}/index.js", f"云函数 {fn} index"))
      checks.append(exists(ROOT / f"cloudfunctions/{fn}/package.json", f"云函数 {fn} package"))
      checks.append(exists(ROOT / f"cloudfunctions/{fn}/config.json", f"云函数 {fn} config"))

    passed = sum(1 for x in checks if x)
    total = len(checks)
    print(f"\n社交风控场景验证完成: {passed}/{total} 通过")
    if passed != total:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
