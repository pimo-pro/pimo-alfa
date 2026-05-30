/**
 * Estado centralizado do Viewer Engine (seleção, hover, ferramenta, highlight, flags).
 * Extraído do ViewerCore para desacoplar estado da orquestração.
 */

import type { InternalSelectionState } from "../selection/internalSelectionTypes";

export type TransformMode = "translate" | "rotate" | "scale" | null;
export type PlacementMode = "door" | "window" | null;
export type ViewerRenderMode = "performance" | "showcase";

export class ViewerState {
  private selectedBoxId: string | null = null;
  private hoveredBoxId: string | null = null;
  private selectedWallIndex: number | null = null;
  private selectedRoomElementId: string | null = null;
  private selectedRemateId: string | null = null;
  private selectedHematiId: string | null = null;
  private selectedRodapeId: string | null = null;
  private transformMode: TransformMode = null;
  private placementMode: PlacementMode = null;
  private highlightEnabled = false;
  private suppressNextCanvasClick = false;
  private transformControlsDragging = false;
  private wallGizmoDragging = false;
  private currentMode: ViewerRenderMode = "performance";
  private wallEditMode = false;
  private internalSelection: InternalSelectionState | null = null;
  private internalSelectionEnabled = false;

  getSelectedBox(): string | null {
    return this.selectedBoxId;
  }
  setSelectedBox(id: string | null): void {
    this.selectedBoxId = id;
  }

  getHoveredBox(): string | null {
    return this.hoveredBoxId;
  }
  setHoveredBox(id: string | null): void {
    this.hoveredBoxId = id;
  }

  getSelectedWallIndex(): number | null {
    return this.selectedWallIndex;
  }
  setSelectedWallIndex(v: number | null): void {
    this.selectedWallIndex = v;
  }

  getSelectedRoomElementId(): string | null {
    return this.selectedRoomElementId;
  }
  setSelectedRoomElementId(v: string | null): void {
    this.selectedRoomElementId = v;
  }

  getSelectedRemate(): string | null {
    return this.selectedRemateId;
  }
  setSelectedRemate(id: string | null): void {
    this.selectedRemateId = id;
  }

  getSelectedHemati(): string | null {
    return this.selectedHematiId;
  }
  setSelectedHemati(id: string | null): void {
    this.selectedHematiId = id;
  }

  getSelectedRodape(): string | null {
    return this.selectedRodapeId;
  }
  setSelectedRodape(id: string | null): void {
    this.selectedRodapeId = id;
  }

  getCurrentTool(): TransformMode {
    return this.transformMode;
  }
  setCurrentTool(mode: TransformMode): void {
    this.transformMode = mode;
  }

  getPlacementMode(): PlacementMode {
    return this.placementMode;
  }
  setPlacementMode(mode: PlacementMode): void {
    this.placementMode = mode;
  }

  getCurrentMode(): ViewerRenderMode {
    return this.currentMode;
  }
  setCurrentMode(mode: ViewerRenderMode): void {
    this.currentMode = mode;
  }

  getHighlightEnabled(): boolean {
    return this.highlightEnabled;
  }
  setHighlightEnabled(v: boolean): void {
    this.highlightEnabled = v;
  }

  getSuppressNextCanvasClick(): boolean {
    return this.suppressNextCanvasClick;
  }
  setSuppressNextCanvasClick(v: boolean): void {
    this.suppressNextCanvasClick = v;
  }

  getTransformControlsDragging(): boolean {
    return this.transformControlsDragging;
  }
  setTransformControlsDragging(v: boolean): void {
    this.transformControlsDragging = v;
  }

  getWallGizmoDragging(): boolean {
    return this.wallGizmoDragging;
  }
  setWallGizmoDragging(v: boolean): void {
    this.wallGizmoDragging = v;
  }

  getWallEditMode(): boolean {
    return this.wallEditMode;
  }
  setWallEditMode(v: boolean): void {
    this.wallEditMode = v;
  }

  getInternalSelection(): InternalSelectionState | null {
    return this.internalSelection;
  }

  setInternalSelection(v: InternalSelectionState | null): void {
    this.internalSelection = v;
  }

  getInternalSelectionEnabled(): boolean {
    return this.internalSelectionEnabled;
  }

  setInternalSelectionEnabled(v: boolean): void {
    this.internalSelectionEnabled = v;
  }

  limparHover(): void {
    this.hoveredBoxId = null;
  }

  limparSelecao(): void {
    this.selectedBoxId = null;
    this.selectedWallIndex = null;
    this.selectedRoomElementId = null;
    this.selectedRemateId = null;
    this.selectedHematiId = null;
    this.selectedRodapeId = null;
    this.internalSelection = null;
  }
}
