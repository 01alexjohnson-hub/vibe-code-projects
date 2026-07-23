import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface AddWordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (word: string) => void;
  disabled?: boolean;
}

/**
 * Add-to-dictionary modal (yt-hub-dictionary-add-word-modal.jpg). LocalFlow's
 * `custom_words` setting is a flat word list (no misspelling→correction pair
 * storage), so unlike Wispr's reference this is a single field — building the
 * "correct a misspelling" arrow-pair UI would be fake functionality the
 * backend can't actually store.
 */
export const AddWordModal: React.FC<AddWordModalProps> = ({
  open,
  onOpenChange,
  onAdd,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [word, setWord] = useState("");

  const trimmed = word.trim();
  const isValid =
    trimmed.length > 0 && !trimmed.includes(" ") && trimmed.length <= 50;

  const handleAdd = () => {
    if (!isValid) return;
    onAdd(trimmed);
    setWord("");
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) setWord("");
    onOpenChange(nextOpen);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title={t("hub.dictionary.modal.title")}
      closeLabel={t("hub.dictionary.modal.cancel")}
      footer={
        <>
          <Button
            variant="secondary"
            size="md"
            onClick={() => handleClose(false)}
          >
            {t("hub.dictionary.modal.cancel")}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleAdd}
            disabled={!isValid || disabled}
          >
            {t("hub.dictionary.modal.add")}
          </Button>
        </>
      }
    >
      <Input
        type="text"
        autoFocus
        value={word}
        onChange={(e) => setWord(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
          }
        }}
        placeholder={t("hub.dictionary.modal.placeholder")}
        variant="compact"
        className="w-full"
      />
    </Dialog>
  );
};

export default AddWordModal;
