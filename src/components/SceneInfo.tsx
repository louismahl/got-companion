type SceneCharacter = {
  name: string;
};

type CharacterEntry = {
  characterName: string;
  characterImageThumb?: string;
  characterImageFull?: string;
  houseName?: string[] | string;
  characterLink?: string; // IMDB link relatif
  actorName?: string;
};

type Props = {
  sceneLocation?: string;
  characters: SceneCharacter[];
  charactersIndex: Map<string, CharacterEntry>;
};

export default function SceneInfo({ sceneLocation, characters, charactersIndex, showPhotos = true }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {characters.map((c) => {
        const ch = charactersIndex.get(c.name);
        const img = ch?.characterImageThumb || ch?.characterImageFull;

        return (
          <div key={c.name} style={{ textAlign: 'center', fontSize: 13 }}>
            {showPhotos && img ? (
              <img
                src={img}
                alt={c.name}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  marginBottom: 4,
                  display: 'block'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'; // cache l’image cassée
                }}
              />
            ) : null}

            <div>{c.name}</div>
          </div>
        );
      })}
    </div>
  );
}
