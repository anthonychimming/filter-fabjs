# Gate 3 hard-edge numerical review criterion

This criterion applies to reviews of GPU-admitted `sdfRoundedBox()` on tested hardware. A hard fill covers a signed distance of zero or less. Record exact zero separately from an interior distance, even when both pack to the same coverage byte.

1. Require exact expected coverage for the named dynamic-rotation reproduction, the analytic exactly representable cardinal boundary fixtures and the complete-filter hard-edge fixtures. A discrepancy in these controls fails the review.
2. For each other classification disagreement, use the independent geometric reference with the evaluated CPU inputs, before binary32 conversion. In reference precision, translate the sample by the center and inverse-rotate into box-local coordinates `u,v`. Let `L = max(1, abs(u), abs(v), abs(width)/2, abs(height)/2)`.
3. Use the binary32 spacing in the binade containing `L`: `U = 2^(floor(log2(L)) - 23)` pixels. At an exact power of two use the spacing immediately above it. An independent check can bracket `L` with the largest binary32 value at or below it and that value's successor, then subtract the two.
4. Permit the disagreement only if **both** conditions hold:
   - The independent signed distance satisfies `abs(d_ref) <= U`.
   - The measured scalar satisfies `abs(d_gpu - d_ref) <= max(0.0001, 8 * 2^-23 * S)` pixels, where `S = max(1, abs(x), abs(y), abs(cx), abs(cy), abs(width), abs(height))`. Use full dimensions in this existing scalar limit.
5. Record the input, pixel, reference and GPU distances, Worker and GPU classifications and coverage bytes, both bounds, and the absolute scalar error. Evaluate unrounded values. A nonfinite or missing measurement cannot pass. Fail the review if either limit is exceeded.

The one-ULP bound measures the reference point's proximity to the geometric boundary. The separate scalar limit measures distance error. This criterion belongs exclusively to validation. The renderer continues to compare the calculated signed distance against zero. Radius-zero equivalence with `sdfBox()` is mathematical; tight hard edges can produce different packed bytes.

**Evidence scope:** Gate 3 final acceptance (Intel Iris Xe gen-12lp, Chrome 157, driver 30.0.100.9864), runtime implementation `7e57c540de69d4c8bac7a2a7ad5034de5c670326`, acceptance documentation tip `63b63878a6676a4939176fd1fc6d7cd789c61a47`. These commits were local at Gate 4 staging; this policy file does not assert deployment.
