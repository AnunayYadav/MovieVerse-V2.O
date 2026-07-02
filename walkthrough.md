# Walkthrough - Removal of Miruro/Anikoto and Retention of Anikai

I have successfully removed the Miruro and Anikoto anime streaming providers from both the frontend player UI and the backend scraper API as requested. **Anikai** has been kept as the primary, fully-functional anime streaming provider.

## Changes Made

### 1. Backend Scraper API Cleanup
#### [MODIFY] [anime.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Anunayy/AntiGravity/MovieVerse-V2.O/api/anime.ts)
- Removed all unused constants, imports, and helper functions associated with Miruro and Anikoto (e.g., `ANIKOTO_BASE`, `ANIKOTO_API_BASE`, `EMBED_BASE`, `MIRURO_PIPE_URL`, `MIRURO_HEADERS`, `extractAnikotoId`, `encodePipeRequest`, and `decodePipeResponse`).
- Removed `resolveAnikoto` function.
- Removed `anikoto` and `miruro` routing handler cases from the main API endpoint handler, leaving only `anikai` and the default Consumet AniList Meta action handlers.

### 2. Frontend Player Integration Cleanup
#### [MODIFY] [MoviePlayer.tsx](file:///c:/Users/ASUS/OneDrive/Desktop/Anunayy/AntiGravity/MovieVerse-V2.O/components/MoviePlayer.tsx)
- Removed `miruro` and `anikoto` objects from the global `PROVIDERS` list.
- Cleaned up the preferred provider local storage initialization to remove fallback references to `miruro` and `anikoto`.
- Removed `miruro` reference from the `useCustomControls` check.
- Removed `miruro` referer proxy configuration inside quality selection (`handleQualityChange`) and decrypted stream resolution hooks.
- Cleaned up source provider filter loops to exclude `anikoto` and `miruro`.

#### [MODIFY] [MovieDetails.tsx](file:///c:/Users/ASUS/OneDrive/Desktop/Anunayy/AntiGravity/MovieVerse-V2.O/components/MovieDetails.tsx)
- Updated source provider filter loops to exclude `anikoto` and `miruro`.

## Verification Results

### Project Build
- Executed `npm run build` locally: the production build completed successfully with zero TypeScript compilation errors or build warnings.
