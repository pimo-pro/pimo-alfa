import {
  clearTextureCache,
  getCachedTexture,
  loadTextureAsync,
  releaseTexture,
} from "../materials/textureCache";

export type TextureLoaderFacade = {
  loadAsync: typeof loadTextureAsync;
  getCached: typeof getCachedTexture;
  release: typeof releaseTexture;
  clearCache: typeof clearTextureCache;
};

/** Facade fina sobre o cache de texturas; ponto de extensão para GLTF/SketchUp futuros. */
export function createTextureLoaderFacade(): TextureLoaderFacade {
  return {
    loadAsync: loadTextureAsync,
    getCached: getCachedTexture,
    release: releaseTexture,
    clearCache: clearTextureCache,
  };
}
