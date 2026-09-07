import { useState } from 'react';
import { blocks } from '../engine/blocks/blocks';
import { RECIPES, ingredientIds, matchRecipe, type Grid } from '../engine/crafting/recipes';
import { blockIconDataUrl } from '../game/blockIcons';
import { getEngine } from '../game/engineRef';
import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';
import { Sheet } from './ui/Sheet';

const EMPTY: Grid = [null, null, null, null, null, null, null, null, null];

function Tile({ id, label, onClick, selected }: { id: string | null; label: string; onClick: () => void; selected?: boolean }) {
  const def = id ? blocks.byId(id) : undefined;
  const icon = id ? blockIconDataUrl(id) : null;
  return (
    <button
      type="button"
      className={`craft-cell ${selected ? 'craft-cell-selected' : ''}`}
      style={icon ? { backgroundImage: `url(${icon})`, backgroundColor: def?.color } : def ? { background: def.color } : undefined}
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
    >
      {!icon && def && <span aria-hidden="true">{def.emoji}</span>}
    </button>
  );
}

/**
 * The picture recipe book. Tap a cell, tap an ingredient; when the grid
 * matches a recipe the result lights up. "Make it!" puts it in the hotbar.
 * The book fills the grid for you when you tap a recipe.
 */
export function CraftingPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const closePanels = useGameStore((state) => state.closePanels);
  const [grid, setGrid] = useState<Grid>(EMPTY);
  const [cell, setCell] = useState<number | null>(null);
  const [tab, setTab] = useState<'grid' | 'book'>('book');
  if (openPanel !== 'crafting') return null;
  const recipe = matchRecipe(grid);
  const resultDef = recipe ? blocks.byId(recipe.result) : undefined;
  const resultIcon = recipe ? blockIconDataUrl(recipe.result) : null;

  return (
    <Sheet title="Crafting" emoji="🔨" onClose={closePanels} hint={tab === 'book' ? 'Tap a recipe to see how it is made.' : 'Tap a square, then tap an ingredient.'}>
      <div className="craft-tabs" role="tablist">
        <KidButton tone={tab === 'book' ? 'primary' : 'default'} role="tab" aria-selected={tab === 'book'} onClick={() => setTab('book')}>
          📖 Recipe book
        </KidButton>
        <KidButton tone={tab === 'grid' ? 'primary' : 'default'} role="tab" aria-selected={tab === 'grid'} onClick={() => setTab('grid')}>
          🧩 Make your own
        </KidButton>
      </div>

      {tab === 'book' && (
        <div className="palette-grid recipe-grid">
          {RECIPES.map((r) => {
            const icon = blockIconDataUrl(r.result);
            const def = blocks.byId(r.result);
            return (
              <button
                key={r.id}
                type="button"
                className="palette-slot"
                style={icon ? { backgroundImage: `url(${icon})`, backgroundColor: def?.color } : { background: def?.color ?? '#ccc' }}
                aria-label={`Recipe: ${r.label}`}
                onClick={() => {
                  setGrid([...r.grid]);
                  setCell(null);
                  setTab('grid');
                }}
              >
                {!icon && <span aria-hidden="true">{r.emoji}</span>}
                <span className="palette-label">{r.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {tab === 'grid' && (
        <div className="craft-area">
          <div className="craft-grid" role="group" aria-label="Crafting grid">
            {grid.map((id, i) => (
              <Tile key={i} id={id} label={`Square ${i + 1}${id ? `: ${blocks.byId(id)?.label}` : ''}`} selected={cell === i} onClick={() => (id && cell === i ? (setGrid(grid.map((g, j) => (j === i ? null : g))), setCell(null)) : setCell(i))} />
            ))}
          </div>
          <div className="craft-result">
            <span className="craft-arrow" aria-hidden="true">
              ➡️
            </span>
            <div className={`craft-cell craft-cell-result ${recipe ? 'craft-cell-ready' : ''}`} style={resultIcon ? { backgroundImage: `url(${resultIcon})`, backgroundColor: resultDef?.color } : undefined} aria-label={recipe ? `Makes ${recipe.count} ${recipe.label}` : 'Nothing yet'}>
              {recipe && recipe.count > 1 && <span className="craft-count">×{recipe.count}</span>}
            </div>
            <p className="craft-hint">{recipe ? `${recipe.emoji} ${recipe.label}! ${recipe.hint}` : 'Keep trying! Tap the book for ideas.'}</p>
            <KidButton
              tone="primary"
              disabled={!recipe}
              onClick={() => {
                if (!recipe) return;
                getEngine()?.craft(recipe.id) ?? useGameStore.getState().receiveCrafted(resultDef?.numericId ?? 0, recipe.label, recipe.count);
                setGrid(EMPTY);
                setCell(null);
              }}
            >
              ✨ Make it!
            </KidButton>
            <KidButton onClick={() => { setGrid(EMPTY); setCell(null); }}>🧹 Clear</KidButton>
          </div>
          <h3>Ingredients</h3>
          <div className="palette-grid ingredient-grid">
            {ingredientIds().map((id) => (
              <Tile
                key={id}
                id={id}
                label={`Ingredient ${blocks.byId(id)?.label}`}
                onClick={() => {
                  const target = cell ?? grid.findIndex((g) => g === null);
                  if (target < 0) return;
                  setGrid(grid.map((g, j) => (j === target ? id : g)));
                  const nextEmpty = grid.findIndex((g, j) => g === null && j !== target);
                  setCell(nextEmpty >= 0 ? nextEmpty : null);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
