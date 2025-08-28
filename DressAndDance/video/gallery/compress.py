#!/usr/bin/env python3
# compress.py
# 用法: python compress.py input.mp4
# 依赖: pip install imageio imageio-ffmpeg

import sys
import os
import imageio

def main():
    if len(sys.argv) < 2:
        print("Usage: python compress.py <input.mp4>")
        sys.exit(1)

    in_path = sys.argv[1]
    if not os.path.isfile(in_path):
        print(f"Input not found: {in_path}")
        sys.exit(1)

    root, ext = os.path.splitext(in_path)
    out_path = root + "_preview.mp4"

    # 读取输入视频以获取 fps（不做逐帧缩放，交给 ffmpeg 处理）
    reader = imageio.get_reader(in_path)
    meta = reader.get_meta_data()
    fps = meta.get("fps", 30)

    # 质量设置说明：
    # - 使用 x264 的 CRF 模式（越小越清晰，越大越小体积）
    # - 你提的“质量7”这里映射为 crf=28；可按需微调
    crf = "28"

    # 写出参数：
    # -vf scale=iw/2:ih/2  -> 一半分辨率
    # -crf 28              -> 压缩强度
    # -preset medium       -> 编码速度/质量折中（可改 fast/slow等）
    # -pix_fmt yuv420p     -> 兼容大多数播放器
    # -movflags +faststart -> 提前写 moov，网页可边下边播
    writer = imageio.get_writer(
        out_path,
        fps=fps,
        codec="libx264",
        pixelformat="yuv420p",
        ffmpeg_params=[
            "-vf", "scale=iw/2:ih/2",
            "-crf", crf,
            "-preset", "medium",
            "-movflags", "+faststart",
        ],
    )

    try:
        for frame in reader:
            writer.append_data(frame)
    finally:
        writer.close()
        reader.close()

    print(f"Done. Wrote: {out_path}")

if __name__ == "__main__":
    main()
