import { ImageResponse } from "next/og";

export const socialPreviewSize = {
  width: 1200,
  height: 630,
};

export function createSocialPreview() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          backgroundColor: "#07152f",
          backgroundImage:
            "linear-gradient(90deg, rgba(7,21,47,0.96) 0%, rgba(7,21,47,0.84) 48%, rgba(7,21,47,0.28) 100%), url(https://royalruns.co.uk/images/royal-runs/courier-van-loading.jpg)",
          backgroundPosition: "center",
          backgroundSize: "cover",
          color: "white",
          display: "flex",
          height: "100%",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px 76px",
            width: "720px",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: "22px" }}>
            <div
              style={{
                alignItems: "center",
                background: "white",
                borderRadius: "20px",
                display: "flex",
                height: "108px",
                justifyContent: "center",
                width: "108px",
              }}
            >
              <svg height="88" viewBox="0 0 64 64" width="88">
                <path
                  d="M18 18 32 10l14 8-14 8-14-8Z"
                  fill="none"
                  stroke="#07152f"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="5"
                />
                <path
                  d="M18 18v18l14 8 14-8V18M32 26v18"
                  fill="none"
                  stroke="#0047bb"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="5"
                />
                <path
                  d="M4 27h9M8 37h7"
                  fill="none"
                  stroke="#ef3340"
                  strokeLinecap="round"
                  strokeWidth="5"
                />
              </svg>
            </div>
            <span style={{ fontSize: "58px", fontWeight: 900, letterSpacing: "-2px" }}>
              Royal Runs
            </span>
          </div>
          <div
            style={{
              background: "#ef3340",
              borderRadius: "8px",
              display: "flex",
              height: "8px",
              marginTop: "38px",
              width: "92px",
            }}
          />
          <div style={{ display: "flex", fontSize: "47px", fontWeight: 800, lineHeight: 1.08, marginTop: "24px" }}>
            Fast, reliable parcel delivery across the UK
          </div>
          <div style={{ color: "#dbeafe", display: "flex", fontSize: "23px", marginTop: "26px" }}>
            Book deliveries and track every parcel at royalruns.co.uk
          </div>
        </div>
      </div>
    ),
    socialPreviewSize,
  );
}
