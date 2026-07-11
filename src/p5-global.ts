/**
 * Exposes the bundled p5 on the global scope.
 *
 * UMD p5 plugins (p5.capture references a bare `p5` global the moment its
 * module evaluates) can't see the bundler's module-scoped p5. Import this
 * module BEFORE any plugin import so the global exists when they load.
 * @p5-wrapper/react resolves to this same hoisted p5@1.x, so plugin
 * prototype hooks apply to the instances the wrapper creates.
 */
import p5 from "p5";

(globalThis as Record<string, unknown>).p5 = p5;

export default p5;
