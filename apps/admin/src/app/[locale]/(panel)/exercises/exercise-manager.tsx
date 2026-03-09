"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@fitfast/ui/button";
import { Input } from "@fitfast/ui/input";
import { cn } from "@fitfast/ui/cn";
import { Plus, Search, Pencil, Trash2, Power, Loader2, X } from "lucide-react";

type Category = "compound" | "accessory" | "isolation" | "warmup" | "cooldown" | "cardio";

const CATEGORIES: Category[] = [
  "compound",
  "accessory",
  "isolation",
  "warmup",
  "cooldown",
  "cardio",
];

interface ExerciseFormData {
  name: string;
  nameAr: string;
  category: Category;
  movementPattern: string;
  primaryMuscles: string;
  secondaryMuscles: string;
  equipment: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  instructions: string;
  instructionsAr: string;
  contraindications: string;
  defaultSets: number;
  defaultRepsMin: number;
  defaultRepsMax: number;
  defaultRestSeconds: number;
  sortOrder: number;
  gifUrl: string;
}

const INITIAL_FORM: ExerciseFormData = {
  name: "",
  nameAr: "",
  category: "compound",
  movementPattern: "push",
  primaryMuscles: "",
  secondaryMuscles: "",
  equipment: "",
  difficulty: "intermediate",
  instructions: "",
  instructionsAr: "",
  contraindications: "",
  defaultSets: 3,
  defaultRepsMin: 8,
  defaultRepsMax: 12,
  defaultRestSeconds: 60,
  sortOrder: 100,
  gifUrl: "",
};

export function ExerciseManager() {
  const t = useTranslations("exercises");
  const tCommon = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<Id<"exerciseDatabase"> | null>(null);
  const [form, setForm] = useState<ExerciseFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Queries
  const allExercises = useQuery(api.exerciseDatabase.listExercises);
  const searchResults = useQuery(
    api.exerciseDatabase.searchExercises,
    searchQuery.trim() ? { query: searchQuery.trim() } : "skip",
  );

  // Mutations
  const createExercise = useMutation(api.exerciseDatabase.createExercise);
  const updateExercise = useMutation(api.exerciseDatabase.updateExercise);
  const toggleActive = useMutation(api.exerciseDatabase.toggleActive);
  const deleteExercise = useMutation(api.exerciseDatabase.deleteExercise);

  const exercises = searchQuery.trim() ? searchResults : allExercises;
  const filteredExercises =
    filterCategory === "all" ? exercises : exercises?.filter((e) => e.category === filterCategory);

  function openAddModal() {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setShowModal(true);
  }

  function openEditModal(exercise: NonNullable<typeof allExercises>[number]) {
    setEditingId(exercise._id);
    setForm({
      name: exercise.name,
      nameAr: exercise.nameAr,
      category: exercise.category as Category,
      movementPattern: exercise.movementPattern,
      primaryMuscles: exercise.primaryMuscles.join(", "),
      secondaryMuscles: exercise.secondaryMuscles.join(", "),
      equipment: exercise.equipment.join(", "),
      difficulty: exercise.difficulty,
      instructions: exercise.instructions,
      instructionsAr: exercise.instructionsAr,
      contraindications: exercise.contraindications.join(", "),
      defaultSets: exercise.defaultSets,
      defaultRepsMin: exercise.defaultRepsMin,
      defaultRepsMax: exercise.defaultRepsMax,
      defaultRestSeconds: exercise.defaultRestSeconds,
      sortOrder: exercise.sortOrder ?? 100,
      gifUrl: exercise.gifUrl ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const splitToArray = (s: string) =>
        s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);

      const data = {
        name: form.name,
        nameAr: form.nameAr,
        category: form.category,
        movementPattern: form.movementPattern as any,
        primaryMuscles: splitToArray(form.primaryMuscles),
        secondaryMuscles: splitToArray(form.secondaryMuscles),
        equipment: splitToArray(form.equipment),
        difficulty: form.difficulty,
        instructions: form.instructions,
        instructionsAr: form.instructionsAr,
        contraindications: splitToArray(form.contraindications),
        defaultSets: form.defaultSets,
        defaultRepsMin: form.defaultRepsMin,
        defaultRepsMax: form.defaultRepsMax,
        defaultRestSeconds: form.defaultRestSeconds,
        sortOrder: form.sortOrder,
        ...(form.gifUrl.trim() ? { gifUrl: form.gifUrl.trim() } : {}),
      };

      if (editingId) {
        await updateExercise({ id: editingId, ...data });
      } else {
        await createExercise(data);
      }
      setShowModal(false);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: Id<"exerciseDatabase">) {
    setTogglingId(id);
    try {
      await toggleActive({ id });
    } catch (err) {
      console.error("Toggle failed:", err);
      alert(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: Id<"exerciseDatabase">) {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await deleteExercise({ id });
    } catch (err) {
      console.error("Delete failed:", err);
      alert(err instanceof Error ? err.message : t("saveFailed"));
    }
  }

  const isLoading = exercises === undefined;

  return (
    <div className="space-y-4">
      {/* Search + Filter + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as Category | "all")}
          className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">{t("allCategories")}</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {t(cat)}
            </option>
          ))}
        </select>
        <Button onClick={openAddModal} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("addExercise")}
        </Button>
      </div>

      {/* Exercise count */}
      {filteredExercises && (
        <p className="text-sm text-stone-500">
          {t("exerciseCount", { count: filteredExercises.length })}
        </p>
      )}

      {/* Exercise List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        </div>
      ) : !filteredExercises || filteredExercises.length === 0 ? (
        <p className="py-12 text-center text-sm text-stone-400">{t("noExercises")}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-200">
          <table className="w-full text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-start font-medium text-stone-600">{t("name")}</th>
                <th className="hidden px-4 py-3 text-start font-medium text-stone-600 md:table-cell">
                  {t("nameAr")}
                </th>
                <th className="px-4 py-3 text-start font-medium text-stone-600">{t("category")}</th>
                <th className="hidden px-4 py-3 text-start font-medium text-stone-600 lg:table-cell">
                  {t("difficulty")}
                </th>
                <th className="hidden px-4 py-3 text-start font-medium text-stone-600 lg:table-cell">
                  {t("primaryMuscles")}
                </th>
                <th className="px-4 py-3 text-start font-medium text-stone-600">{t("isActive")}</th>
                <th className="px-4 py-3 text-end font-medium text-stone-600">{tCommon("edit")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredExercises.map((exercise) => (
                <tr
                  key={exercise._id}
                  className={cn(
                    "transition-colors hover:bg-stone-50",
                    !exercise.isActive && "opacity-50",
                  )}
                >
                  <td className="px-4 py-3 font-medium">{exercise.name}</td>
                  <td className="hidden px-4 py-3 text-stone-500 md:table-cell" dir="rtl">
                    {exercise.nameAr}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                      {t(exercise.category)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-stone-500 lg:table-cell">
                    {t(exercise.difficulty)}
                  </td>
                  <td className="hidden px-4 py-3 text-stone-500 lg:table-cell">
                    {exercise.primaryMuscles.slice(0, 3).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(exercise._id)}
                      disabled={togglingId === exercise._id}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                        exercise.isActive
                          ? "bg-green-100 text-green-600 hover:bg-green-200"
                          : "bg-stone-100 text-stone-400 hover:bg-stone-200",
                      )}
                    >
                      {togglingId === exercise._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(exercise)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(exercise._id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingId ? t("editExercise") : t("addExercise")}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">{t("name")}</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("nameAr")}
                </label>
                <Input
                  dir="rtl"
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("category")}
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                  className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {t(cat)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("movementPattern")}
                </label>
                <select
                  value={form.movementPattern}
                  onChange={(e) => setForm({ ...form, movementPattern: e.target.value })}
                  className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm"
                >
                  {["push", "pull", "squat", "hinge", "carry", "rotation", "other"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("difficulty")}
                </label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value as any })}
                  className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm"
                >
                  {["beginner", "intermediate", "advanced"].map((d) => (
                    <option key={d} value={d}>
                      {t(d)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("sortOrder")}
                </label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("primaryMuscles")} (comma-separated)
                </label>
                <Input
                  value={form.primaryMuscles}
                  onChange={(e) => setForm({ ...form, primaryMuscles: e.target.value })}
                  placeholder="chest, shoulders, triceps"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("secondaryMuscles")} (comma-separated)
                </label>
                <Input
                  value={form.secondaryMuscles}
                  onChange={(e) => setForm({ ...form, secondaryMuscles: e.target.value })}
                  placeholder="core, back"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("equipment")} (comma-separated)
                </label>
                <Input
                  value={form.equipment}
                  onChange={(e) => setForm({ ...form, equipment: e.target.value })}
                  placeholder="barbell, bench"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("contraindications")} (comma-separated)
                </label>
                <Input
                  value={form.contraindications}
                  onChange={(e) => setForm({ ...form, contraindications: e.target.value })}
                  placeholder="knee, lower back"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("instructions")}
                </label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("instructionsAr")}
                </label>
                <textarea
                  dir="rtl"
                  value={form.instructionsAr}
                  onChange={(e) => setForm({ ...form, instructionsAr: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("gifUrl")}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={form.gifUrl}
                    onChange={(e) => setForm({ ...form, gifUrl: e.target.value })}
                    placeholder={t("gifUrlPlaceholder")}
                    className="flex-1"
                  />
                  {form.gifUrl.trim() && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, gifUrl: "" })}
                      className="rounded-md border border-stone-200 px-2 text-xs text-stone-500 hover:bg-stone-50"
                    >
                      {t("removeGif")}
                    </button>
                  )}
                </div>
                {form.gifUrl.trim() && /^https:\/\/.+/.test(form.gifUrl.trim()) && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs text-stone-500">{t("gifPreview")}</p>
                    <img
                      src={form.gifUrl}
                      alt="Exercise GIF preview"
                      className="h-32 w-32 rounded-lg border border-stone-200 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("defaultSets")}
                </label>
                <Input
                  type="number"
                  value={form.defaultSets}
                  onChange={(e) => setForm({ ...form, defaultSets: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("defaultRepsMin")}
                </label>
                <Input
                  type="number"
                  value={form.defaultRepsMin}
                  onChange={(e) => setForm({ ...form, defaultRepsMin: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("defaultRepsMax")}
                </label>
                <Input
                  type="number"
                  value={form.defaultRepsMax}
                  onChange={(e) => setForm({ ...form, defaultRepsMax: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  {t("defaultRestSeconds")}
                </label>
                <Input
                  type="number"
                  value={form.defaultRestSeconds}
                  onChange={(e) => setForm({ ...form, defaultRestSeconds: Number(e.target.value) })}
                />
              </div>
            </div>

            {saveError && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {saveError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.nameAr}>
                {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {tCommon("save")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
