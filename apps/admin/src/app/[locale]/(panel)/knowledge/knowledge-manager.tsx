"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useConvexAuth, useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  BookOpen,
  Plus,
  FileText,
  Upload,
  Trash2,
  Loader2,
  X,
  Pencil,
  UtensilsCrossed,
  Search,
} from "lucide-react";
import { cn } from "@fitfast/ui/cn";
import type { Id } from "@/convex/_generated/dataModel";

const CATEGORY_OPTIONS = [
  "protein",
  "carb",
  "fat",
  "vegetable",
  "fruit",
  "dairy",
  "dessert",
  "recipe",
] as const;

export function KnowledgeManager() {
  const t = useTranslations("knowledge");
  const { isAuthenticated } = useConvexAuth();
  const [activeTab, setActiveTab] = useState<"knowledge" | "food">("knowledge");

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1">
        <button
          onClick={() => setActiveTab("knowledge")}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "knowledge"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700",
          )}
        >
          <BookOpen className="me-1.5 -mt-0.5 inline h-4 w-4" />
          {t("knowledgeTab")}
        </button>
        <button
          onClick={() => setActiveTab("food")}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "food"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-500 hover:text-stone-700",
          )}
        >
          <UtensilsCrossed className="me-1.5 -mt-0.5 inline h-4 w-4" />
          {t("foodTab")}
        </button>
      </div>

      {activeTab === "knowledge" ? <KnowledgeTab /> : <FoodTab />}
    </div>
  );
}

/* ─── Knowledge Tab (original) ─── */
function KnowledgeTab() {
  const t = useTranslations("knowledge");
  const { isAuthenticated } = useConvexAuth();
  const entries = useQuery(api.knowledgeBase.listKnowledgeEntries, isAuthenticated ? {} : "skip");
  const addTextEntry = useMutation(api.knowledgeBase.addTextEntry);
  const deleteEntry = useMutation(api.knowledgeBase.deleteKnowledgeEntry);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const processPdf = useAction(api.knowledgeBaseActions.processPdfUploadPublic);

  const [showAddText, setShowAddText] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pdfTags, setPdfTags] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const updateEntry = useMutation(api.knowledgeBase.updateKnowledgeEntry);

  const TAG_OPTIONS = [
    { id: "nutrition", color: "bg-green-50 text-green-700 border-green-200" },
    { id: "workout", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { id: "recovery", color: "bg-purple-50 text-purple-700 border-purple-200" },
    { id: "general", color: "bg-stone-50 text-stone-700 border-stone-200" },
  ] as const;

  const toggleTag = (tagId: string, list: string[], setList: (tags: string[]) => void) => {
    setList(list.includes(tagId) ? list.filter((t) => t !== tagId) : [...list, tagId]);
  };

  const getTagColor = (tagId: string) =>
    TAG_OPTIONS.find((t) => t.id === tagId)?.color ?? "bg-stone-50 text-stone-600 border-stone-200";

  const handleAddText = async () => {
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true);
    try {
      await addTextEntry({
        title: title.trim(),
        content: content.trim(),
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });
      setTitle("");
      setContent("");
      setSelectedTags([]);
      setShowAddText(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".pdf")) return;

    setIsUploading(true);
    try {
      const url = await generateUploadUrl({ purpose: "knowledge_pdf" });
      const uploadResult = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await uploadResult.json();

      await processPdf({
        title: file.name.replace(/\.pdf$/i, ""),
        storageId,
        tags: pdfTags.length > 0 ? pdfTags : undefined,
      });
    } finally {
      setIsUploading(false);
      setPdfTags([]);
      e.target.value = "";
    }
  };

  const handleDelete = async (entryId: Id<"coachKnowledge">) => {
    setDeletingId(entryId);
    try {
      await deleteEntry({ entryId });
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (entry: {
    _id: string;
    title: string;
    content?: string;
    tags?: string[];
  }) => {
    setEditingId(entry._id);
    setEditTitle(entry.title);
    setEditContent(entry.content || "");
    setEditTags(entry.tags || []);
    setExpandedId(entry._id);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
    setEditTags([]);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    setIsSavingEdit(true);
    try {
      await updateEntry({
        entryId: editingId as Id<"coachKnowledge">,
        title: editTitle.trim(),
        content: editContent.trim(),
        tags: editTags.length > 0 ? editTags : undefined,
      });
      cancelEditing();
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowAddText(!showAddText)}
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("addText")}
        </button>
        <label
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-stone-50",
            isUploading && "pointer-events-none opacity-50",
          )}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isUploading ? t("uploading") : t("uploadPdf")}
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handlePdfUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* PDF Tag Selection (shown inline) */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-500">{t("selectTags")}</label>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id, pdfTags, setPdfTags)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                pdfTags.includes(tag.id)
                  ? `${tag.color} ring-1 ring-current`
                  : "border-stone-200 text-stone-400 hover:border-stone-300",
              )}
            >
              {t(`tag${tag.id.charAt(0).toUpperCase()}${tag.id.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Add Text Form */}
      {showAddText && (
        <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t("addTextEntry")}</h3>
            <button
              onClick={() => setShowAddText(false)}
              className="text-stone-400 hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder={t("titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="focus:ring-primary/20 focus:border-primary w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
          />
          <textarea
            placeholder={t("contentPlaceholder")}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="focus:ring-primary/20 focus:border-primary w-full resize-y rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-500">
              {t("selectTags")}
            </label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id, selectedTags, setSelectedTags)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    selectedTags.includes(tag.id)
                      ? `${tag.color} ring-1 ring-current`
                      : "border-stone-200 text-stone-400 hover:border-stone-300",
                  )}
                >
                  {t(`tag${tag.id.charAt(0).toUpperCase()}${tag.id.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleAddText}
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("save")}
          </button>
        </div>
      )}

      {/* Entries List */}
      {entries === undefined ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-stone-400" />
          <h3 className="font-semibold text-stone-600">{t("emptyTitle")}</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry._id;
            return (
              <div
                key={entry._id}
                className={cn(
                  "cursor-pointer rounded-xl border bg-white p-4 transition-colors",
                  isExpanded
                    ? "border-primary/30 ring-primary/10 ring-1"
                    : "border-stone-200 hover:border-stone-300",
                )}
                onClick={() => setExpandedId(isExpanded ? null : entry._id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        entry.type === "pdf"
                          ? "bg-red-50 text-red-500"
                          : "bg-blue-50 text-blue-500",
                      )}
                    >
                      {entry.type === "pdf" ? (
                        <Upload className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{entry.title}</h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-stone-500 uppercase">
                          {entry.type}
                        </span>
                        {entry.content && (
                          <span className="text-xs text-stone-400">
                            {entry.content.split(/\s+/).length} {t("words")}
                          </span>
                        )}
                        {entry.tags?.map((tag: string) => (
                          <span
                            key={tag}
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              getTagColor(tag),
                            )}
                          >
                            {t(`tag${tag.charAt(0).toUpperCase()}${tag.slice(1)}`)}
                          </span>
                        ))}
                      </div>
                      {entry.content && !isExpanded && (
                        <p className="mt-2 line-clamp-2 text-xs text-stone-500">
                          {entry.content.slice(0, 200)}
                          {entry.content.length > 200 ? "..." : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(entry);
                      }}
                      className="hover:text-primary hover:bg-primary/10 rounded-lg p-2 text-stone-400 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(entry._id);
                      }}
                      disabled={deletingId === entry._id}
                      className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    >
                      {deletingId === entry._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                {isExpanded && editingId === entry._id ? (
                  <div className="mt-3 space-y-3 border-t border-stone-100 pt-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="focus:ring-primary/20 focus:border-primary w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold focus:ring-2 focus:outline-none"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      rows={12}
                      className="focus:ring-primary/20 focus:border-primary w-full resize-y rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                    />
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-stone-500">
                        {t("selectTags")}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TAG_OPTIONS.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTag(tag.id, editTags, setEditTags);
                            }}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                              editTags.includes(tag.id)
                                ? `${tag.color} ring-1 ring-current`
                                : "border-stone-200 text-stone-400 hover:border-stone-300",
                            )}
                          >
                            {t(`tag${tag.id.charAt(0).toUpperCase()}${tag.id.slice(1)}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveEdit();
                        }}
                        disabled={isSavingEdit || !editTitle.trim()}
                        className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                      >
                        {isSavingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t("save")}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEditing();
                        }}
                        className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                ) : isExpanded && entry.content ? (
                  <div className="mt-3 border-t border-stone-100 pt-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-stone-700">
                      {entry.content}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Food & Recipes Tab ─── */
function FoodTab() {
  const t = useTranslations("knowledge");
  const { isAuthenticated } = useConvexAuth();

  const [showAddForm, setShowAddForm] = useState(false);
  const [isRecipeMode, setIsRecipeMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState<"all" | "ingredient" | "recipe">("all");

  // Form fields
  const [foodName, setFoodName] = useState("");
  const [foodNameAr, setFoodNameAr] = useState("");
  const [foodCategory, setFoodCategory] = useState("protein");
  const [foodTags, setFoodTags] = useState<string[]>([]);
  const [cal100, setCal100] = useState("");
  const [pro100, setPro100] = useState("");
  const [carb100, setCarb100] = useState("");
  const [fat100, setFat100] = useState("");
  // Recipe-specific
  const [servingSize, setServingSize] = useState("");
  const [calServing, setCalServing] = useState("");
  const [proServing, setProServing] = useState("");
  const [carbServing, setCarbServing] = useState("");
  const [fatServing, setFatServing] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");

  const foods = useQuery(
    api.foodDatabase.listFoods,
    isAuthenticated
      ? {
          category: filterCategory || undefined,
          isRecipe: filterType === "all" ? undefined : filterType === "recipe",
          search: searchQuery || undefined,
        }
      : "skip",
  );
  const addFood = useMutation(api.foodDatabase.addFood);
  const deleteFood = useMutation(api.foodDatabase.deleteFood);

  const FOOD_TAG_OPTIONS = [
    "high_protein",
    "low_fat",
    "low_carb",
    "high_fiber",
    "healthy_dessert",
    "junk_made_healthy",
    "comfort_food",
    "post_workout",
    "egyptian",
    "middle_eastern",
    "international",
    "quick_prep",
    "meal_prep_friendly",
    "dairy_free",
    "gluten_free",
    "vegan",
    "vegetarian",
  ];

  const resetForm = () => {
    setFoodName("");
    setFoodNameAr("");
    setFoodCategory("protein");
    setFoodTags([]);
    setCal100("");
    setPro100("");
    setCarb100("");
    setFat100("");
    setServingSize("");
    setCalServing("");
    setProServing("");
    setCarbServing("");
    setFatServing("");
    setIngredients("");
    setInstructions("");
    setShowAddForm(false);
    setIsRecipeMode(false);
  };

  const handleAdd = async () => {
    if (!foodName.trim() || !cal100 || !pro100 || !carb100 || !fat100) return;
    setIsSubmitting(true);
    try {
      await addFood({
        name: foodName.trim(),
        nameAr: foodNameAr.trim() || undefined,
        category: foodCategory,
        tags: foodTags,
        per100g: {
          calories: parseFloat(cal100),
          protein: parseFloat(pro100),
          carbs: parseFloat(carb100),
          fat: parseFloat(fat100),
        },
        isRecipe: isRecipeMode,
        servingSize: isRecipeMode && servingSize ? servingSize : undefined,
        perServing:
          isRecipeMode && calServing
            ? {
                calories: parseFloat(calServing),
                protein: parseFloat(proServing || "0"),
                carbs: parseFloat(carbServing || "0"),
                fat: parseFloat(fatServing || "0"),
              }
            : undefined,
        ingredients:
          isRecipeMode && ingredients.trim()
            ? ingredients.trim().split("\n").filter(Boolean)
            : undefined,
        instructions:
          isRecipeMode && instructions.trim()
            ? instructions.trim().split("\n").filter(Boolean)
            : undefined,
      });
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFood = async (id: Id<"foodDatabase">) => {
    setDeletingId(id);
    try {
      await deleteFood({ foodId: id });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setShowAddForm(true);
            setIsRecipeMode(false);
          }}
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("addFood")}
        </button>
        <button
          onClick={() => {
            setShowAddForm(true);
            setIsRecipeMode(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-stone-50"
        >
          <Plus className="h-4 w-4" />
          {t("addRecipe")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder={t("foodName") + "..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="focus:ring-primary/20 focus:border-primary w-full rounded-lg border border-stone-200 py-2 ps-9 pe-3 text-sm focus:ring-2 focus:outline-none"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">{t("allCategories")}</option>
          {CATEGORY_OPTIONS.map((cat) => (
            <option key={cat} value={cat}>
              {t(`categories.${cat}`)}
            </option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-stone-200">
          {(["all", "ingredient", "recipe"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-3 py-2 text-xs font-medium transition-colors",
                filterType === type
                  ? "bg-primary text-white"
                  : "bg-white text-stone-600 hover:bg-stone-50",
              )}
            >
              {type === "all"
                ? t("allItems")
                : type === "ingredient"
                  ? t("ingredientsOnly")
                  : t("recipesOnly")}
            </button>
          ))}
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{isRecipeMode ? t("addRecipe") : t("addFood")}</h3>
            <button onClick={resetForm} className="text-stone-400 hover:text-stone-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder={t("foodName")}
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="focus:ring-primary/20 focus:border-primary rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
            <input
              type="text"
              placeholder={t("foodNameAr")}
              value={foodNameAr}
              onChange={(e) => setFoodNameAr(e.target.value)}
              className="focus:ring-primary/20 focus:border-primary rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              dir="rtl"
            />
          </div>

          <select
            value={foodCategory}
            onChange={(e) => setFoodCategory(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>
                {t(`categories.${cat}`)}
              </option>
            ))}
          </select>

          {/* Macros per 100g */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-500">
              {t("per100g")}
            </label>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="number"
                placeholder={t("caloriesPer100g")}
                value={cal100}
                onChange={(e) => setCal100(e.target.value)}
                className="focus:ring-primary/20 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
              <input
                type="number"
                placeholder={t("proteinPer100g")}
                value={pro100}
                onChange={(e) => setPro100(e.target.value)}
                className="focus:ring-primary/20 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
              <input
                type="number"
                placeholder={t("carbsPer100g")}
                value={carb100}
                onChange={(e) => setCarb100(e.target.value)}
                className="focus:ring-primary/20 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
              <input
                type="number"
                placeholder={t("fatPer100g")}
                value={fat100}
                onChange={(e) => setFat100(e.target.value)}
                className="focus:ring-primary/20 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          {/* Recipe-specific fields */}
          {isRecipeMode && (
            <>
              <input
                type="text"
                placeholder={t("servingSize")}
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
                className="focus:ring-primary/20 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-500">
                  {t("perServing")}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    placeholder={t("caloriesPerServing")}
                    value={calServing}
                    onChange={(e) => setCalServing(e.target.value)}
                    className="focus:ring-primary/20 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder={t("proteinPerServing")}
                    value={proServing}
                    onChange={(e) => setProServing(e.target.value)}
                    className="focus:ring-primary/20 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder={t("carbsPerServing")}
                    value={carbServing}
                    onChange={(e) => setCarbServing(e.target.value)}
                    className="focus:ring-primary/20 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder={t("fatPerServing")}
                    value={fatServing}
                    onChange={(e) => setFatServing(e.target.value)}
                    className="focus:ring-primary/20 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>
              <textarea
                placeholder={t("ingredientsList")}
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                rows={4}
                className="focus:ring-primary/20 w-full resize-y rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
              <textarea
                placeholder={t("instructionsList")}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                className="focus:ring-primary/20 w-full resize-y rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
            </>
          )}

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-stone-500">
              {t("foodTags")}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FOOD_TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setFoodTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                    )
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all",
                    foodTags.includes(tag)
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-stone-200 text-stone-400 hover:border-stone-300",
                  )}
                >
                  {tag.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={isSubmitting || !foodName.trim() || !cal100}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("save")}
          </button>
        </div>
      )}

      {/* Food List */}
      {foods === undefined ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        </div>
      ) : foods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-12 text-center">
          <UtensilsCrossed className="mx-auto mb-3 h-10 w-10 text-stone-400" />
          <h3 className="font-semibold text-stone-600">{t("emptyFoodTitle")}</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
            {t("emptyFoodDescription")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-stone-500">
            {foods.length} {t("foodItems")}
          </p>
          {foods.map((food) => (
            <div key={food._id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{food.name}</h3>
                    {food.nameAr && (
                      <span className="text-xs text-stone-400" dir="rtl">
                        {food.nameAr}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                      {t(`categories.${food.category}`)}
                    </span>
                    {food.isRecipe && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        {t("recipesOnly")}
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        food.source === "coach"
                          ? "border-orange-200 bg-orange-50 text-orange-700"
                          : "border-green-200 bg-green-50 text-green-700",
                      )}
                    >
                      {food.source === "coach" ? t("coach") : t("verified")}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-stone-500">
                    <span>{food.per100g.calories} kcal</span>
                    <span>P: {food.per100g.protein}g</span>
                    <span>C: {food.per100g.carbs}g</span>
                    <span>F: {food.per100g.fat}g</span>
                    <span className="text-stone-400">({t("per100g")})</span>
                  </div>
                  {food.isRecipe && food.perServing && (
                    <div className="mt-0.5 flex gap-4 text-xs text-stone-400">
                      <span>{food.perServing.calories} kcal</span>
                      <span>P: {food.perServing.protein}g</span>
                      <span>C: {food.perServing.carbs}g</span>
                      <span>F: {food.perServing.fat}g</span>
                      <span>({t("perServing")})</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteFood(food._id)}
                  disabled={deletingId === food._id}
                  className="shrink-0 rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                >
                  {deletingId === food._id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
